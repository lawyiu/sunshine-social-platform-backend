import { Router } from "itty-router";

const origin = "https://sunshine-social-platform-lawcyiu.pages.dev";

// Create a new router
const router = Router();

/*
Our index route, a simple hello world.
*/
router.get("/", () => {
    return new Response("Hello, world! This is the root page of the posts worker.");
});

/*
Checks that an object has expected attributes.
*/
function checkObjAttributes(obj, attributes) {
    let result = { ok: true, missingAttrs: "" };

    for (const attribute of attributes) {
        if (obj[attribute] == undefined) {
            result.ok = false;

            if (result.missingAttrs != "") {
                result.missingAttrs += ", ";
            }

            result.missingAttrs += attribute;
        }
    }

    return result;
}

// Returns false if any post attributes are empty otherwise true
function checkNotEmptyPost(post) {
    if (post.username == "" || post.title == "" || post.content == "") {
        return false;
    } else {
        return true;
    }
}

/*
GET all posts.
*/
router.get("/posts", async () => {
    const posts = [];
    const list = await Posts.list();

    for (const key of list.keys) {
        posts.push(await Posts.get(key.name, { type: "json" }));
    }

    const json = JSON.stringify(posts);

    return new Response(json, {
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Content-Type": "application/json;charset=UTF-8"
        }
    });
});

/*
This shows a different HTTP method, a POST.

Try send a POST request using curl or another tool.

Try the below curl command to send JSON:

$ curl -X POST <worker> -H "Content-Type: application/json" -d '{"title": "foo", "username": "bar", "content": "blah"}'
*/
router.post("/posts", async request => {
    let ok = false;
    let errorMsg = "";

    if (request.headers.get("Content-Type") === "application/json") {
        try {
            var post = await request.json();
        } catch (err) {
            errorMsg = "Invalid JSON!";
        }

        if (errorMsg == "") {
            const result = checkObjAttributes(post, ["title", "username", "content"]);
            if (!result.ok) {
                errorMsg = `Missing attribute(s): ${result.missingAttrs}`;
            } else if (!checkNotEmptyPost(post)) {
                errorMsg = `Empty title, username, or content.`;
            } else {
                const key = Date.now() + ":" + post.username;
                await Posts.put(key, JSON.stringify(post));
                ok = true;
            }
        }
    } else {
        errorMsg = "I only understand JSON.";
    }

    const header = { "Access-Control-Allow-Origin": origin };

    if (ok) {
        return new Response("success", { headers: header });
    } else {
        return new Response(errorMsg, { headers: header, status: 400 });
    }
});

router.options("/posts", async request => {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": 86400
        },
        status: 204
    });
});

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).

Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all("*", () => new Response("404, not found!", { status: 404 }));

/*
This snippet ties our worker to the router we defined above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener("fetch", e => {
    e.respondWith(router.handle(e.request));
});