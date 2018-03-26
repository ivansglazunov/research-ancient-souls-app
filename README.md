```bash
docker run -d --name orientdb -p 2424:2424 -p 2480:2480 -e ORIENTDB_ROOT_PASSWORD=root orientdb:latest

git clone git@gitlab.com:ivansglazunov/research-ancient-souls-app.git
cd research-ancient-souls-app
npm install

PORT=3000 npm start
```