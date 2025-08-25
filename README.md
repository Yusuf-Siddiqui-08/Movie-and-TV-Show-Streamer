# Movie and TV Show Streamer
## Description:
This program deploys a **Flask** website on a **Waitress** WSGI server on the internet where it can be accessed by any user. A user can then interact with the website with the following features:
- Able to search for any available movie on the **2Embed** database
- Able search for any available TV show
- Able to then watch their movie
- Able to watch any available episode from any season on their TV show

## Using it for personal use:
The following are steps to deploy this program on your own.
### Fork via Repl (simplest way)
![Repl logo](https://cdn.freebiesupply.com/logos/large/2x/replit-logo-png-transparent.png)
1. Have a Repl account prepared at [replit.com](replit.com)
2. Click this [link](https://replit.com/@yusufs98783/streamingService) to go to the Repl home page
3. Click "Fork" to be able to own your own version of this program
![Fork screen shot](/readme_images/replit_fork.png)
4. Click "Run" at the top of the screen when in the editor to run the program
5. Allow for the IDE to load all packages
6. Under the tools section, go to Webview
7. Click the "{...}.replit.dev" at the top of the Webview
![Webview link screen shot](/readme_images/replit_webview.png)
8. Click the dev link
![Dev link screen shot](/readme_images/replit_dev_link.png)
9. Repeat from step 4 each time you want to use

### Download Code via Github and run on another IDE (run on localhost)
1. Switch from "main" branch to "no-waitress" branch
2. Click the green button "Code"
3. Download Zip
4. Find file in File Explorer and "Extract All"
5. Open your preferred IDE and open a new Python 3 project
6. Under File open the extracted zip code and run
7. Click the localhost link that appears in the console

## Technologies Used (imports/packages/modules used)
- Flask
- Waitress
- Datetime
- OS
- JSON
- Requests

# Movie and TV Show Streamer
## Description:
This program deploys a **Flask** website on a **Waitress** WSGI server on the internet where it can be accessed by any user. A user can then interact with the website with the following features:
- Able to search for any available movie on the **2Embed** database
- Able search for any available TV show
- Able to then watch their movie
- Able to watch any available episode from any season on their TV show

## Using it for personal use:
The following are steps to deploy this program on your own.
### Fork via Repl (simplest way)
![Repl logo](https://cdn.freebiesupply.com/logos/large/2x/replit-logo-png-transparent.png)
1. Have a Repl account prepared at [replit.com](replit.com)
2. Click this [link](https://replit.com/@yusufs98783/streamingService) to go to the Repl home page
3. Click "Fork" to be able to own your own version of this program
![Fork screen shot](/readme_images/replit_fork.png)
4. Click "Run" at the top of the screen when in the editor to run the program
5. Allow for the IDE to load all packages
6. Under the tools section, go to Webview
7. Click the "{...}.replit.dev" at the top of the Webview
![Webview link screen shot](/readme_images/replit_webview.png)
8. Click the dev link
![Dev link screen shot](/readme_images/replit_dev_link.png)
9. Repeat from step 4 each time you want to use

### Download Code via Github and run on another IDE (run on localhost)
1. Switch from "main" branch to "no-waitress" branch
2. Click the green button "Code"
3. Download Zip
4. Find file in File Explorer and "Extract All"
5. Open your preferred IDE and open a new Python 3 project
6. Under File open the extracted zip code and run
7. Click the localhost link that appears in the console

## Technologies Used (imports/packages/modules used)
- Flask
- Waitress
- Datetime
- OS
- JSON
- Requests

---

## Front-end migration to React
This app now serves a React single-page application from Flask. The UI has been recreated in React to match the original look and behavior.

- React app entry: static/react/index.html
- React components: static/react/app.jsx (loaded via CDN + Babel for simplicity)
- Styles: static/css/style.css (reused)
- API endpoints provided by Flask:
  - GET /api/search/movie?title=Inception&page=1&sort=popularity&order=desc
  - GET /api/search/tv?title=Breaking%20Bad&page=1&sort=rating&order=desc
- Client routes (hash-based):
  - #/ (home)
  - #/search/movie/:title/:page?sort=&order=
  - #/search/tv/:title/:page?sort=&order=
  - #/watch/movie/:id
  - #/watch/tv/:id

To run locally:
1. Set environment variable TMDB_API_KEY with your TMDB bearer token string (including the "Bearer " prefix).
2. pip install -r requirements.txt (or poetry install)
3. python main.py
4. Open http://localhost:8080 — Flask will serve the React app.
