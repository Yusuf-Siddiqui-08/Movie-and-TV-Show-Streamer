from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import requests
from flask import Flask, render_template, request

# Optional waitress: fall back to Flask dev server if not available
try:
    from waitress import serve  # type: ignore
except Exception:
    serve = None  # type: ignore

TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Validate and build headers once
_tmdb_api_key = os.environ.get("TMDB_API_KEY")
print(_tmdb_api_key)
if not _tmdb_api_key:
    raise RuntimeError("Environment variable TMDB_API_KEY is required. Set it to your TMDB bearer token.")
HEADERS = {
    "accept": "application/json",
    "Authorization": _tmdb_api_key,  # Expecting the correct format already set in env (e.g., 'Bearer <token>')
}

app = Flask(__name__)


def get_year(date: str) -> int:
    date_format = "%Y-%m-%d"
    return datetime.strptime(date, date_format).year


def normalize_year(date_str: Optional[str]) -> Union[int, str]:
    if not date_str:
        return "Unknown"
    try:
        return get_year(date_str)
    except Exception:
        return "Unknown"


def tmdb_search(path: str, query: str, page: int) -> Dict[str, Any]:
    url = f"{TMDB_BASE_URL}{path}?query={requests.utils.quote(query)}&include_adult=false&language=en-US&page={page}"
    response = requests.get(url, headers=HEADERS, timeout=15)
    data = response.json()
    # Pass through TMDB-specific error if present (e.g., status_code 46)
    if isinstance(data, dict) and data.get("status_code"):
        return data
    return data


@app.route("/")
def home() -> str:
    return render_template("home.html")


@app.route("/search/movie/<movie_title>/<int:page_num>/")
def search_movies(movie_title: str, page_num: int):
    data = tmdb_search("/search/movie", movie_title, page_num)

    if data.get("status_code") == 46:
        return data.get("status_message", "An error occurred.")

    total_pages = int(data.get("total_pages", 1))
    if page_num > total_pages:
        return (
            f"There are no more pages! The last page was {total_pages}! "
            f"Click <a href='/search/movie/{movie_title}/{total_pages}/'>here</a> to see the last page!"
        )

    # Build results list with popularity and rating
    results = data.get("results", [])
    results_list: List[Dict[str, Union[str, int, float]]] = []
    for movie in results:
        results_list.append(
            {
                "name": movie.get("original_title", "Unknown"),
                "id": movie.get("id"),
                "year": normalize_year(movie.get("release_date")),
                "popularity": movie.get("popularity", 0.0) or 0.0,
                "rating": movie.get("vote_average", 0.0) or 0.0,
            }
        )

    # Sorting
    sort = request.args.get("sort", "popularity")
    order = request.args.get("order", "desc")
    allowed_sorts = {"popularity", "rating", "year", "name"}
    if sort not in allowed_sorts:
        sort = "popularity"
    if order not in {"asc", "desc"}:
        order = "desc"

    def sort_key(item: Dict[str, Union[str, int, float]]):
        if sort == "popularity":
            return float(item.get("popularity") or 0.0)
        if sort == "rating":
            return float(item.get("rating") or 0.0)
        if sort == "year":
            y = item.get("year")
            return int(y) if isinstance(y, int) else -1
        if sort == "name":
            return str(item.get("name", "")).lower()
        return 0

    reverse = order == "desc"
    try:
        results_list = sorted(results_list, key=sort_key, reverse=reverse)
    except Exception:
        # Fallback to original order in case of any unexpected type issues
        pass

    return render_template(
        "searchMovieResults.html",
        results=results_list,
        page=page_num,
        title=movie_title,
        sort=sort,
        order=order,
    )


@app.route("/search/tv/<tv_title>/<int:page_num>/")
def search_tv(tv_title: str, page_num: int):
    data = tmdb_search("/search/tv", tv_title, page_num)

    if data.get("status_code") == 46:
        return data.get("status_message", "An error occurred.")

    total_pages = int(data.get("total_pages", 1))
    if page_num > total_pages:
        return (
            f"There are no more pages! The last page was {total_pages}! "
            f"Click <a href='/search/tv/{tv_title}/{total_pages}/'>here</a> to see the last page!"
        )

    # Build results list with popularity and rating
    results = data.get("results", [])
    results_list: List[Dict[str, Union[str, int, float]]] = []
    for tv in results:
        results_list.append(
            {
                "name": tv.get("original_name", "Unknown"),
                "id": tv.get("id"),
                "year": normalize_year(tv.get("first_air_date")),
                "popularity": tv.get("popularity", 0.0) or 0.0,
                "rating": tv.get("vote_average", 0.0) or 0.0,
            }
        )

    # Sorting
    sort = request.args.get("sort", "popularity")
    order = request.args.get("order", "desc")
    allowed_sorts = {"popularity", "rating", "year", "name"}
    if sort not in allowed_sorts:
        sort = "popularity"
    if order not in {"asc", "desc"}:
        order = "desc"

    def sort_key(item: Dict[str, Union[str, int, float]]):
        if sort == "popularity":
            return float(item.get("popularity") or 0.0)
        if sort == "rating":
            return float(item.get("rating") or 0.0)
        if sort == "year":
            y = item.get("year")
            return int(y) if isinstance(y, int) else -1
        if sort == "name":
            return str(item.get("name", "")).lower()
        return 0

    reverse = order == "desc"
    try:
        results_list = sorted(results_list, key=sort_key, reverse=reverse)
    except Exception:
        pass

    return render_template(
        "searchTvResults.html",
        results=results_list,
        page=page_num,
        title=tv_title,
        sort=sort,
        order=order,
    )


@app.route("/watch/<item_type>/<id>/")
def watch(item_type: str, id: str):
    if item_type == "movie":
        return render_template("watchMovie.html", id=id)
    if item_type == "tv":
        return render_template("watchTv.html", id=id)
    return "Invalid type", 400


if __name__ == "__main__":
    if serve:
        serve(app, host="0.0.0.0", port=8080)
    else:
        # Fallback for environments without waitress installed
        app.run(host="0.0.0.0", port=8080)
