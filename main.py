from flask import Flask, render_template
from waitress import serve
import requests
import json
import os

headers = {
    "accept": "application/json",
    "Authorization": os.environ['TMDB_API_KEY']
}

app = Flask(__name__)

@app.route("/")
def home():
  return render_template("home.html")

@app.route("/search/movie/<movieTitle>/<pageNum>/")
def searchMovies(movieTitle, pageNum):
  url = "https://api.themoviedb.org/3/search/movie?query=" + movieTitle + "&include_adult=true&language=en-US&page=" + pageNum
  response = requests.get(url, headers=headers)
  results = json.loads(response.content.decode("utf-8"))
  if results.get("status_code") == 46:
    return results.get("status_message")
  results = results.get("results")
  resultsList = {}
  for movie in results:
    resultMovieName = movie["original_title"]
    resultMovieId = movie["id"]
    resultsList[resultMovieName] = resultMovieId
  return render_template("searchResults.html", results=resultsList)

@app.route("/watch/<movieId>/")
def watchMovie(movieId):
  return render_template("watch.html", id=movieId)

if __name__ == "__main__":
  serve(app, host="0.0.0.0", port=8080)