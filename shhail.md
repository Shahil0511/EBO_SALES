
python -m venv .venv                     # create an isolated env (~node_modules, but per-project)
.\.venv\Scripts\Activate.ps1             # activate it — your prompt shows (.venv)
python -m pip install --upgrade pip
pip install -e ".[dev]"                  # install fastapi+uvicorn and the dev tools from pyproject
uvicorn app.main:app --reload --port 8000   # run the server (~node server.js); --reload = hot reload