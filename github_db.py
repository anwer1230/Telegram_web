"""
github_db.py
══════════════════════════════════════════════════════════════
قاعدة بيانات مبنية على GitHub — تخزين ثابت ومنظّم

تعمل كطبقة وسيطة بين التطبيق وGitHub:
  - gh_load(repo_path, local_path, default)
      يحاول تحميل JSON من GitHub أولاً (مع كاش TTL)،
      ثم يسقط إلى الملف المحلي إذا تعذّر الاتصال.
  - gh_save(repo_path, local_path, data, msg)
      يحفظ JSON محلياً فوراً (غير محجوب)،
      ثم يرفعه إلى GitHub في خيط خلفي.
  - invalidate(repo_path)
      يبطل الكاش يدوياً (مثلاً بعد كتابة خارجية).

المستودع المستهدف: anwer1230/Web-browser (main)
الرمز المميّز: GITHUB_TOKEN من متغيرات البيئة
══════════════════════════════════════════════════════════════
"""

import os
import json
import base64
import logging
import threading
import time

import requests as _req

logger = logging.getLogger(__name__)

# ── إعدادات المستودع ────────────────────────────────────────
_REPO   = os.environ.get("BIO_REPO",   "anwer1230/Web-browser")
_BRANCH = os.environ.get("BIO_BRANCH", "main")

def _token():
    return os.environ.get("GITHUB_TOKEN", "")

def _headers():
    t = _token()
    h = {"Accept": "application/vnd.github.v3+json"}
    if t:
        h["Authorization"] = f"token {t}"
    return h

# ── كاش داخلي (TTL = 60 ثانية لكل مسار) ────────────────────
_CACHE: dict = {}          # { repo_path: {"data": ..., "ts": float} }
_CACHE_TTL   = 60          # ثانية
_CACHE_LOCK  = threading.Lock()
_SAVE_LOCK   = threading.Lock()   # ضمان ترتيب الحفظ على GitHub

# ── قراءة من GitHub ──────────────────────────────────────────

def _gh_download(repo_path: str):
    """يُرجع bytes المحتوى إذا نجح، None إذا فشل أو لا يوجد token."""
    if not _token():
        return None
    url = f"https://api.github.com/repos/{_REPO}/contents/{repo_path}"
    try:
        r = _req.get(url, headers=_headers(), params={"ref": _BRANCH}, timeout=10)
        if r.status_code == 200:
            raw = r.json().get("content", "").replace("\n", "")
            return base64.b64decode(raw) if raw else None
        if r.status_code not in (404, 422):
            logger.debug(f"github_db download {repo_path}: HTTP {r.status_code}")
    except Exception as e:
        logger.debug(f"github_db download {repo_path}: {e}")
    return None


def gh_load(repo_path: str, local_path: str = None, default=None):
    """
    يحمّل JSON من GitHub (مع كاش TTL)، أو الملف المحلي، أو القيمة الافتراضية.
    يحدّث الملف المحلي من GitHub تلقائياً للحفاظ على نسخة محلية حديثة.
    """
    if default is None:
        default = {}
    now = time.time()

    # ── 1) تحقق من الكاش ─────────────────────────────────────
    with _CACHE_LOCK:
        cached = _CACHE.get(repo_path)
        if cached and (now - cached["ts"]) < _CACHE_TTL:
            return cached["data"]

    # ── 2) حاول التحميل من GitHub ────────────────────────────
    raw = _gh_download(repo_path)
    if raw:
        try:
            data = json.loads(raw.decode("utf-8"))
            with _CACHE_LOCK:
                _CACHE[repo_path] = {"data": data, "ts": now}
            # حفظ نسخة محلية هادئة
            if local_path:
                try:
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    with open(local_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                except Exception:
                    pass
            return data
        except Exception as e:
            logger.warning(f"github_db gh_load JSON error {repo_path}: {e}")

    # ── 3) سقط إلى الملف المحلي ──────────────────────────────
    if local_path and os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            with _CACHE_LOCK:
                _CACHE[repo_path] = {"data": data, "ts": now}
            return data
        except Exception as e:
            logger.warning(f"github_db gh_load local fallback {local_path}: {e}")

    # ── 4) القيمة الافتراضية ──────────────────────────────────
    return default


# ── الكتابة إلى GitHub ───────────────────────────────────────

def _gh_upload(repo_path: str, content_bytes: bytes, commit_msg: str):
    """يرفع الملف إلى GitHub (يُنفَّذ في خيط خلفي)."""
    if not _token():
        return
    url = f"https://api.github.com/repos/{_REPO}/contents/{repo_path}"
    b64 = base64.b64encode(content_bytes).decode("utf-8")
    sha = None
    try:
        r = _req.get(url, headers=_headers(), params={"ref": _BRANCH}, timeout=10)
        if r.status_code == 200:
            sha = r.json().get("sha")
    except Exception:
        pass
    payload = {"message": commit_msg, "content": b64, "branch": _BRANCH}
    if sha:
        payload["sha"] = sha
    try:
        with _SAVE_LOCK:
            r = _req.put(url, headers=_headers(), json=payload, timeout=30)
        if r.status_code in (200, 201):
            logger.debug(f"github_db ✓ رُفع {repo_path}")
        else:
            logger.warning(f"github_db ✗ فشل رفع {repo_path}: {r.status_code} {r.text[:80]}")
    except Exception as e:
        logger.warning(f"github_db ✗ استثناء رفع {repo_path}: {e}")


def gh_save(repo_path: str, local_path: str, data, commit_msg: str = "تحديث بيانات"):
    """
    يحفظ JSON:
      1. محلياً فوراً (غير محجوب).
      2. في الكاش (لتجنب قراءة زائدة فورية).
      3. يرسل الرفع إلى GitHub في خيط خلفي (غير محجوب).
    """
    content = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")

    # ── حفظ محلي فوري ────────────────────────────────────────
    if local_path:
        try:
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "w", encoding="utf-8") as f:
                f.write(content.decode("utf-8"))
        except Exception as e:
            logger.error(f"github_db local save failed {local_path}: {e}")

    # ── تحديث الكاش ──────────────────────────────────────────
    with _CACHE_LOCK:
        _CACHE[repo_path] = {"data": data, "ts": time.time()}

    # ── رفع إلى GitHub في خيط خلفي ──────────────────────────
    if _token():
        t = threading.Thread(
            target=_gh_upload,
            args=(repo_path, content, commit_msg),
            daemon=True,
            name=f"gh-save-{repo_path.replace('/', '-')}"
        )
        t.start()


def invalidate(repo_path: str):
    """إبطال الكاش لمسار محدد — يُستدعى بعد تعديل خارجي."""
    with _CACHE_LOCK:
        _CACHE.pop(repo_path, None)


def invalidate_all():
    """إبطال كامل الكاش."""
    with _CACHE_LOCK:
        _CACHE.clear()
