from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import requests
from flask import Flask, request, jsonify, send_from_directory

# Optional waitress: fall back to Flask dev server if not available
try:
    from waitress import serve  # type: ignore
except Exception:
    serve = None  # type: ignore

TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Validate and build headers once (do not print secrets)
_tmdb_api_key = os.environ.get("TMDB_API_KEY")
if not _tmdb_api_key:
    raise RuntimeError("Environment variable TMDB_API_KEY is required. Set it to your TMDB API token.")
# Support both raw token and already-prefixed 'Bearer ...'
_auth_value = _tmdb_api_key if _tmdb_api_key.lower().startswith("bearer ") else f"Bearer {_tmdb_api_key}"
HEADERS = {
    "accept": "application/json",
    "Authorization": _auth_value,
}

app = Flask(__name__, static_folder="static", static_url_path="/static")


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


@app.get("/api/search/movie")
def api_search_movies():
    movie_title = (request.args.get("title", "") or "").strip()
    try:
        page_num = int(request.args.get("page", "1") or 1)
    except Exception:
        page_num = 1
    if not movie_title:
        return jsonify({"error": "Missing required 'title' parameter"}), 400

    data = tmdb_search("/search/movie", movie_title, page_num)
    if data.get("status_code") == 46:
        return jsonify({
            "error": data.get("status_message", "An error occurred."),
            "status_code": 46,
        }), 400

    total_pages = int(data.get("total_pages", 1))

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
        pass

    return jsonify({
        "results": results_list,
        "page": page_num,
        "title": movie_title,
        "sort": sort,
        "order": order,
        "total_pages": total_pages,
    })


@app.get("/api/search/tv")
def api_search_tv():
    tv_title = (request.args.get("title", "") or "").strip()
    try:
        page_num = int(request.args.get("page", "1") or 1)
    except Exception:
        page_num = 1
    if not tv_title:
        return jsonify({"error": "Missing required 'title' parameter"}), 400

    data = tmdb_search("/search/tv", tv_title, page_num)
    if data.get("status_code") == 46:
        return jsonify({
            "error": data.get("status_message", "An error occurred."),
            "status_code": 46,
        }), 400

    total_pages = int(data.get("total_pages", 1))

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

    return jsonify({
        "results": results_list,
        "page": page_num,
        "title": tv_title,
        "sort": sort,
        "order": order,
        "total_pages": total_pages,
    })


def _full_poster_url(poster_path: Optional[str]) -> Optional[str]:
    if not poster_path:
        return None
    # Use a larger size for better quality posters
    return f"https://image.tmdb.org/t/p/w500{poster_path}"


@app.get("/api/details/<kind>/<int:item_id>")
def api_details(kind: str, item_id: int):
    kind = (kind or "").strip().lower()
    if kind not in {"movie", "tv"}:
        return jsonify({"error": "Invalid kind. Must be 'movie' or 'tv'."}), 400
    # Build TMDB details URL with credits appended
    url = f"{TMDB_BASE_URL}/{kind}/{item_id}?append_to_response=credits&language=en-US"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        data: Dict[str, Any] = resp.json()
    except Exception as e:
        return jsonify({"error": f"Failed to fetch details: {e}"}), 502

    if isinstance(data, dict) and data.get("status_code") and data.get("status_code") != 1:
        # TMDB style error
        return jsonify({"error": data.get("status_message", "Failed to fetch details."), "status_code": data.get("status_code")}), 400

    # Extract name/title depending on kind
    name = data.get("original_title") if kind == "movie" else data.get("original_name")
    overview = data.get("overview") or ""
    poster = _full_poster_url(data.get("poster_path"))

    # Extract directors from crew (job contains 'Director')
    directors: List[str] = []
    try:
        crew = ((data.get("credits") or {}).get("crew") or [])
        for c in crew:
            job = (c.get("job") or "").lower()
            if "director" in job:
                nm = c.get("name")
                if nm and nm not in directors:
                    directors.append(nm)
        # Fallback for TV: use creators if no directors found
        if kind == "tv" and not directors:
            creators = data.get("created_by") or []
            for c in creators:
                nm = c.get("name")
                if nm and nm not in directors:
                    directors.append(nm)
    except Exception:
        pass

    # Extract top actors (cast)
    actors: List[str] = []
    try:
        cast = ((data.get("credits") or {}).get("cast") or [])
        for c in cast:
            nm = c.get("name")
            if nm and nm not in actors:
                actors.append(nm)
    except Exception:
        pass

    # Common fields for both kinds
    genres = [g.get("name") for g in (data.get("genres") or []) if g.get("name")]
    vote_count = data.get("vote_count")
    vote_average = data.get("vote_average")

    # Movie/TV specific fields
    movie_fields: Dict[str, Any] = {}
    tv_fields: Dict[str, Any] = {}
    if kind == "movie":
        movie_fields = {
            "runtime": data.get("runtime"),  # minutes
            "release_date": data.get("release_date"),
        }
    else:
        tv_fields = {
            "first_air_date": data.get("first_air_date"),
            "last_air_date": data.get("last_air_date"),
            "in_production": data.get("in_production"),
            "number_of_seasons": data.get("number_of_seasons"),
            "number_of_episodes": data.get("number_of_episodes"),
            "series_type": data.get("type"),
        }

    return jsonify({
        "id": item_id,
        "kind": kind,
        "name": name or "Unknown",
        "overview": overview,
        "poster": poster,
        "directors": directors,
        "actors": actors,
        "genres": genres,
        "vote_count": vote_count,
        "vote_average": vote_average,
        **movie_fields,
        **tv_fields,
    })


# Serve the React single-page app
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_client(path: str):
    # Always serve the SPA entry; static assets are handled by Flask static
    return send_from_directory(os.path.join(app.static_folder, "react"), "index.html")


if __name__ == "__main__":
    if serve:
        serve(app, host="0.0.0.0", port=8080)
    else:
        # Fallback for environments without waitress installed
        app.run(host="0.0.0.0", port=8080)
