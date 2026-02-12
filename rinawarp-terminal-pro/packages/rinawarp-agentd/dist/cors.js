export function setCors(req, res) {
    const origin = req.headers.origin || "";
    // VSCode webviews can be weird; simplest allow localhost callers.
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type,authorization");
}
export function handlePreflight(req, res) {
    setCors(req, res);
    res.statusCode = 204;
    res.end();
}
