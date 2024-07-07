from flask import Flask, render_template
from waitress import serve
import requests
import json

#url = "https://api.themoviedb.org/3/search/movie?query=john wick&include_adult=false&language=en-US&page=1"

headers = {
    "accept": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhZWViOTcyZWI0Y2IzN2VlYzk0NDQ2NWY5ZWZmOGVjNyIsInN1YiI6IjY0NzNiMWI0OWFlNjEzMDEwNDVhZjA0YyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.znnMuDSefeevNYsSVORaZYN_iGlvS-tLrI5n2-iqOAs"
}

#response = requests.get(url, headers=headers)

#print(json.loads(response.content.decode("utf-8")).get("results")[0])

app = Flask(__name__)

@app.route("/")
def home():
  return render_template("home.html")

@app.route("/search/movie/<movieTitle>/<pageNum>/")
def searchMovies(movieTitle, pageNum):
  url = "https://api.themoviedb.org/3/search/movie?query=" + movieTitle + "&include_adult=true&language=en-US&page=" + pageNum
  response = requests.get(url, headers=headers)
  results = json.loads(response.content.decode("utf-8")).get("results")
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