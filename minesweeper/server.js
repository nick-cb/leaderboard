const http = require("node:http");

const server = http.createServer();

server.on("clientError", (err, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.on("request", (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      hello: "world",
    }),
  );
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
/*
 * - A socket can either be alive or destroyed depended on the "keepAlive" option
   - The "keepAlive" option is not the same as "Connection: keep-alive" header
 * - The server may close the idle connections or refuse multiple requests over same
 connection
 * - Q: What is a socket? What is a connection? How do they relate?
 * 
 */
