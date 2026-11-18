const http = require("http");
const { S3Client } = require("@aws-sdk/client-s3");

let cachedClockOffsetMs = 0;
let lastProbeAt = 0;
let probePromise = null;

function probeAwsClockOffset() {
    const now = Date.now();
    if (probePromise) return probePromise;
    if (lastProbeAt && now - lastProbeAt < 5 * 60 * 1000) {
        return Promise.resolve(cachedClockOffsetMs);
    }
    probePromise = new Promise((resolve) => {
        const req = http.request(
            {
                method: "HEAD",
                host: "s3.amazonaws.com",
                path: "/",
                timeout: 3000,
            },
            (res) => {
                const dateHeader = res.headers?.date;
                if (dateHeader) {
                    const serverMs = Date.parse(dateHeader);
                    if (Number.isFinite(serverMs)) {
                        cachedClockOffsetMs = serverMs - Date.now();
                        lastProbeAt = Date.now();
                    }
                }
                res.resume();
                resolve(cachedClockOffsetMs);
            }
        );
        req.on("error", () => resolve(cachedClockOffsetMs));
        req.on("timeout", () => {
            req.destroy();
            resolve(cachedClockOffsetMs);
        });
        req.end();
    }).finally(() => {
        probePromise = null;
    });
    return probePromise;
}

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

s3.middlewareStack.add(
    (next) => async (args) => {
        const offset = await probeAwsClockOffset();
        if (Math.abs(offset) > 60 * 1000) {
            s3.config.systemClockOffset = offset;
        }
        return next(args);
    },
    {
        step: "initialize",
        name: "syncAwsClockOffsetMiddleware",
        priority: "high",
    }
);

s3.getSigningDate = async function getSigningDate() {
    const offset = await probeAwsClockOffset();
    return new Date(Date.now() + offset);
};

module.exports = s3;
