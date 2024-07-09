from datetime import datetime
import json
import os

from flask import Flask, render_template
from waitress import serve
import requests

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
  url = "https://api.themoviedb.org/3/search/movie?query=" + movieTitle + "&include_adult=false&language=en-US&page=" + pageNum
  response = requests.get(url, headers=headers)
  results = json.loads(response.content.decode("utf-8"))
  if results.get("status_code") == 46:
    return results.get("status_message")
  total_pages = results.get("total_pages")
  if total_pages < int(pageNum):
    return "There are no more pages! The last page was " + str(total_pages) + "! Click <a href='/search/movie/" + movieTitle + "/" + str(total_pages) + "/'>here</a> to see the last page!"
  results = results.get("results")
  resultsList = []
  i = 0
  for movie in results:
    i+=1
    resultMovieYear = movie.get("release_date")
    if resultMovieYear == None: 
      resultMovieYear = "Unknown"
    else:
      date_format = "%Y-%m-%d"
      resultMovieYear = datetime.strptime(resultMovieYear, date_format).year
    resultMovieName = movie["original_title"]
    resultMovieId = movie["id"]
    resultsList.append({"name":resultMovieName, "id" : resultMovieId, "year" : resultMovieYear})
  return render_template("searchResults.html", results=resultsList)

@app.route("/watch/<movieId>/")
def watchMovie(movieId):
  return render_template("watch.html", id=movieId)

if __name__ == "__main__":
  serve(app, host="0.0.0.0", port=8080)