"""Is PaddleOCR in table-recognize actually running on the GPU?

config says device="gpu", but Paddle falls back to CPU silently when CUDA
cannot be loaded. 38s/page for detect+recognise is slow enough to be worth
confirming rather than assuming.
"""
import os
import subprocess
import sys
import threading
import time

SVC = r"C:\Aizera\RPA\table-recognize-3parts"
sys.path.insert(0, SVC)
os.chdir(SVC)

# api.py registers the CUDA/cuDNN DLL directories before importing paddle;
# without it the import chain fails on torch's shm.dll.
import glob  # noqa: E402

for _root in [os.environ.get("NVIDIA_DLL_ROOT", ""),
              r"C:\Aizera\RPA\PythonLibrary\.venv\Lib\site-packages\nvidia"]:
    if _root and os.path.isdir(_root):
        for _bin in glob.glob(os.path.join(_root, "*", "bin")):
            try:
                os.add_dll_directory(_bin)
            except Exception:
                pass
            os.environ["PATH"] = _bin + os.pathsep + os.environ.get("PATH", "")
        break

import config  # noqa: E402
# Import order matters: paddleocr must come before paddle, otherwise the
# paddlex -> modelscope -> torch chain loads first and dies on shm.dll.
from paddleocr import PaddleOCR  # noqa: E402
import preprocess               # noqa: E402
import paddle                   # noqa: E402

print("=== paddle build ===")
print("  version              :", paddle.__version__)
print("  compiled with CUDA   :", paddle.device.is_compiled_with_cuda())
print("  paddle.get_device()  :", paddle.get_device())
print("  config.device        :", config.device)
try:
    print("  cuda device count    :", paddle.device.cuda.device_count())
except Exception as exc:
    print("  cuda device count    : failed:", exc)

# Does a tensor op actually land on the GPU?
try:
    paddle.set_device("gpu")
    t = paddle.rand([1000, 1000])
    _ = paddle.matmul(t, t)
    print("  gpu tensor op        : OK (place=%s)" % t.place)
except Exception as exc:
    print("  gpu tensor op        : FAILED:", exc)

print("\n=== sampling GPU utilisation during a real OCR pass ===")
samples = []
stop = threading.Event()


def sample():
    while not stop.is_set():
        try:
            out = subprocess.run(
                ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used",
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=10).stdout.strip()
            util, mem = (int(x) for x in out.split(",")[:2])
            samples.append((util, mem))
        except Exception:
            pass
        time.sleep(1.0)


ocr = PaddleOCR(
    text_detection_model_name=config.model_name_det,
    text_detection_model_dir=config.model_dir_det,
    text_recognition_model_name=config.model_name_rec,
    text_recognition_model_dir=config.model_dir_rec,
    use_doc_orientation_classify=config.use_doc_orientation_classify,
    use_doc_unwarping=config.use_doc_unwarping,
    use_textline_orientation=config.use_textline_orientation,
    device=config.device)

pdf = r"C:\Aizera\RPA\RFQ\ConvertedDrawing\5\0023-62709_01_Green_Standard.pdf"
images = preprocess.process_input_file(
    input_file_path=pdf, session_timestamp=time.strftime("dev_%H%M%S"))
print("  pages: %d" % len(images))

watcher = threading.Thread(target=sample, daemon=True)
watcher.start()
t0 = time.perf_counter()
ocr.predict(images[:2])          # two pages is enough to characterise it
elapsed = time.perf_counter() - t0
stop.set()
watcher.join(timeout=3)

print("\n  2 pages took %.1fs (%.1fs per page)" % (elapsed, elapsed / 2))
if samples:
    utils = [u for u, _ in samples]
    mems = [m for _, m in samples]
    print("  GPU utilisation  : peak %d%%, mean %d%%" % (max(utils), sum(utils) // len(utils)))
    print("  GPU memory used  : peak %d MiB" % max(mems))
    if max(utils) < 15:
        print("\n  -> GPU essentially idle: this is running on the CPU.")
    else:
        print("\n  -> GPU is being used.")
else:
    print("  (no nvidia-smi samples)")
