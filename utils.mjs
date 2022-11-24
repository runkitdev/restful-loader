import https from "node:https";

// Returns: Promise<{ statusCode, headers, body }>
export function promiseRequest(url) {
    return new Promise(function(resolve, reject) {
        https.get(url, function(response){
            const { statusCode, headers } = response;
            let body = "";

            response.on("data", data => body += data);
            response.on("end", () => resolve({ statusCode, headers, body }));
        })
        .on("error", function(e) {
            reject(e);
        });
    });
}
