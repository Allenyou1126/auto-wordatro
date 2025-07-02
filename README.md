# Auto Wordatro

## Dependencies

- Python 3.x (Only version 3.11 tested.)
- Node.js >= 20.19.3
- Flask
- React & React-DOM
- Vite
- Material UI
- Material UI X
- Toolpad Core
- SWR
- Axios

## Run

It's assumed that you have already set up Node.js(>= 20.19.3) and Python 3.x on your PC.

0. (Optional) Create an virtual environment using `python -m venv [Virtual Environment Name]` or other tools and activate it.
1. Install Python dependencies by executing `pip install -r requirements.txt` in the root folder of project.
2. Switch to `frontend-src` directory and run `npm install` / `pnpm install` to install frontend dependencies.
3. Execute `npm run build` / `pnpm build` in `frontend-src` directory to build frontend files.
4. Back to the root folder of project and run `python src/main.py` to start the project. Then the Web UI will be available at `http://127.0.0.1:5000`.

## Appendix

If you have trouble building frontend, you can just copy the built frontend static files(including `index.html` and `assets/*`) to `frontend` folder. Then the step 2 and 3 can be skipped.
