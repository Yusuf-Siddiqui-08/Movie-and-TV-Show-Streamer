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


def get_year(date: str) -> int:
  date_format = "%Y-%m-%d"
  return datetime.strptime(date, date_format).year


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
    return "There are no more pages! The last page was " + str(
        total_pages
    ) + "! Click <a href='/search/movie/" + movieTitle + "/" + str(
        total_pages) + "/'>here</a> to see the last page!"
  results = results.get("results")
  resultsList = []
  for movie in results:
    resultMovieYear = movie.get("release_date")
    if resultMovieYear is None or resultMovieYear == "":
      resultMovieYear = "Unknown"
    else:
      resultMovieYear = get_year(resultMovieYear)
    resultMovieName = movie["original_title"]
    resultMovieId = movie["id"]
    resultsList.append({
        "name": resultMovieName,
        "id": resultMovieId,
        "year": resultMovieYear
    })
  return render_template("searchMovieResults.html",
                         results=resultsList,
                         page=pageNum,
                         title=movieTitle)


@app.route("/search/tv/<tvTitle>/<pageNum>/")
def searchTV(tvTitle, pageNum):
  url = "https://api.themoviedb.org/3/search/tv?query=" + tvTitle + "&include_adult=false&language=en-US&page=" + pageNum
  response = requests.get(url, headers=headers)
  results = json.loads(response.content.decode("utf-8"))
  if results.get("status_code") == 46:
    return results.get("status_message")
  total_pages = results.get("total_pages")
  if total_pages < int(pageNum):
    return "There are no more pages! The last page was " + str(
        total_pages) + "! Click <a href='/search/tv/" + tvTitle + "/" + str(
            total_pages) + "/'>here</a> to see the last page!"
  results = results.get("results")
  resultsList = []
  for tv in results:
    resultTvName = tv["original_name"]
    resultTvId = tv["id"]
    resultTvYear = tv["first_air_date"]
    resultTvYear = "Unknown" if resultTvYear is None else get_year(
        resultTvYear)
    resultsList.append({
        "name": resultTvName,
        "id": resultTvId,
        "year": resultTvYear
    })
  return render_template("searchTvResults.html",
                         results=resultsList,
                         page=pageNum,
                         title=tvTitle)


@app.route("/watch/<type>/<id>/")
def watchMovie(type, id):
  if type == "movie":
    return render_template("watchMovie.html", id=id)
  elif type == "tv":
    return render_template("watchTv.html", id=id)
  else:
    return "Invalid type", 400


if __name__ == "__app__":
  serve(app, host="0.0.0.0", port=8080)
