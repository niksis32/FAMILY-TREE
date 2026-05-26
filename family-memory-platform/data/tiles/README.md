# TileServer GL data directory
#
# 1. Place an MBTiles file at `v3.mbtiles` (e.g. regional extract from Geofabrik + tilemaker).
# 2. Start: docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile tiles up -d
# 3. Web env: NEXT_PUBLIC_TILESERVER_URL=http://localhost:8080
#
# Without v3.mbtiles the UI falls back to sepia-styled OpenStreetMap raster tiles.
