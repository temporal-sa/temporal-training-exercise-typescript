# Sandbox Preset

This directory is an Instruqt **sandbox preset**, slug
`temporal-in-practice-sandbox-typescript`. It has its own versioned release
cycle, pushed and published independently of the track.

```
sandbox/
├── config.yml                    Preset definition: name, slug, containers   [PUSHED]
├── scripts/
│   └── setup-workshop            All provisioning, git included              [PUSHED]
├── proxy/                        Network control panel, fetched via git clone
│   ├── toggle_addon.py           mitmproxy addon, re-reads state.json per request
│   ├── controlpanel.py           Flask UI + REST API on port 5000
│   ├── state.json                Default toggle state
│   └── static/index.html         The toggle UI
└── README.md                     This file
```

Only `config.yml` and `scripts/` are part of the preset payload. `proxy/`
reaches the sandbox through the git clone that `setup-workshop` performs.

## How this ships

| Change | Command | Takes effect |
|--------|---------|--------------|
| `config.yml`, `scripts/` | `instruqt sandbox push` then `instruqt sandbox publish` | Next sandbox **provision**, for every track on the preset |
| `proxy/` | `git push` to `WORKSHOP_REF` | Next sandbox provision |
| `../track/` | `instruqt track push` | Next lab start |

> [!WARNING]
> `instruqt sandbox publish` moves **every track using this preset** to the
> newly published version. Do not publish during a live session.

## Testing locally

`instruqt track validate` does not look at this directory, and a broken
script fails at provision time. Test it in Docker first. From the repository
root:

```bash
docker rm -f instruqt-ts-test 2>/dev/null
docker run -d --name instruqt-ts-test --platform linux/amd64 \
  -p 7298:7233 -p 8298:8233 -p 5098:5000 \
  ubuntu:24.04 sleep infinity

docker exec instruqt-ts-test mkdir -p /opt/instruqt/bootstrap /root/workshop
docker exec instruqt-ts-test touch /opt/instruqt/bootstrap/host-bootstrap-completed

# Seed the working tree; the script then skips its clone.
COPYFILE_DISABLE=1 tar --exclude='./.git' --exclude='./node_modules' \
    --exclude='./lib' --exclude='./course/dist' -cf - . \
  | docker exec -i instruqt-ts-test tar -xf - -C /root/workshop

docker cp instruqt/sandbox/scripts/setup-workshop instruqt-ts-test:/tmp/setup-workshop
docker exec instruqt-ts-test bash /tmp/setup-workshop
```

About two minutes under amd64 emulation on Apple Silicon. Temporal UI lands on
<http://localhost:8298>, the control panel on <http://localhost:5098>.

Then walk every challenge: the check should FAIL before the solve and PASS
after it.

```bash
docker cp instruqt/track instruqt-ts-test:/tmp/track
cat > /tmp/walk.sh << 'EOF'
for d in /tmp/track/0*; do
  echo "### $(basename $d)"
  bash $d/setup-workshop
  bash $d/check-workshop; echo "before solve: exit=$?"
  bash $d/solve-workshop > /dev/null 2>&1
  bash $d/check-workshop; echo "after solve: exit=$?"
  bash $d/cleanup-workshop
done
EOF
docker cp /tmp/walk.sh instruqt-ts-test:/tmp/walk.sh
docker exec instruqt-ts-test bash /tmp/walk.sh

docker rm -f instruqt-ts-test
```

> [!NOTE]
> Run the walk from a script file, not `bash -c '...'`. The setup and cleanup
> scripts `pkill -f "src/worker/index.ts"`, which also matches a `bash -c`
> whose command line contains that string, and kills the harness.

To exercise the real clone path instead, skip the seeding step. `WORKSHOP_REF`
then has to name a pushed ref that contains `instruqt/sandbox/proxy/`:

```bash
docker exec -e WORKSHOP_REF=my-branch instruqt-ts-test bash /tmp/setup-workshop
```

## Push and publish

```bash
cd instruqt/sandbox
instruqt sandbox diff        # local vs remote (fails before the first push)
instruqt sandbox push        # -> draft
instruqt sandbox publish --message="What changed"
```

Then re-warm the Hot Start pool, as `../README.md` describes.

## What setup-workshop provisions

1. System packages: `git`, `curl`, `jq`, `xz-utils`, `procps`, editors.
2. `git clone --depth 1` of the exercise repo to `/root/workshop`.
3. The latest Node.js 22 release, unpacked into `/usr/local`.
4. The Temporal CLI, symlinked to `/usr/local/bin/temporal`.
5. `npm ci` in `/root/workshop`, falling back to `npm install` if the lock file
   has drifted.
6. uv, then mitmproxy and Flask in `/opt/proxy-venv`, and the mitmproxy CA cert
   trusted system-wide.
7. `proxy/` staged to `/root/proxy/` from the clone.
8. Shell environment written to `/etc/profile.d/workshop.sh`.
9. mitmproxy, the control panel, and `temporal server start-dev` with
   `AccountId=Keyword` and `TransferStatus=Keyword` registered, then a health
   wait that fails provisioning if the server never comes up.
10. `exercise8/src/workflow-history-v1.json` seeded from `solution8/`.
11. The `solution6` tests run once, which downloads the test server that
    `TestWorkflowEnvironment.createLocal()` uses into `/tmp` and warms the
    ts-node cache.

### Changing the Node.js version

`NODE_MAJOR` at the top of the script. The script installs the newest release
of that major line at provision time.

### Adding a dependency

A system binary goes in step 1. An npm package goes in the repo's
`package.json`, and reaches the sandbox with a `git push`.

## Things that are easy to break

**Toolchain on the default PATH.** `node`, `npm`, `npx` and `temporal` live
in `/usr/local/bin` on purpose. Check and solve scripts run non-interactively
and never source a profile.

**Proxy variables and loopback.** `@grpc/grpc-js`, which the Client uses,
honors `https_proxy`. `NO_PROXY=127.0.0.1,localhost,::1` keeps the Client's
calls to the dev server off mitmproxy. Drop it and every starter fails.

**Node and the CA.** Node does not read the system certificate store, so
`NODE_EXTRA_CA_CERTS` points at the mitmproxy CA. Without it, `npm` and any
HTTPS call from an Activity fail TLS through the proxy.

**The test server cache.** The SDK keeps the downloaded test server for one
day. After that, the first `createLocal()` in a learner's terminal downloads it
again from `temporal.download`, through the proxy. That path is tested and
works, but it fails while the kill switch is on.

## Network control panel

mitmproxy listens on `127.0.0.1:8888`, every learner shell routes outbound HTTP
and HTTPS through it, and the Flask panel on port 5000 flips toggles by
writing `state.json`. The addon re-reads that file on every request.

| Toggle | Hosts | Effect when off |
|--------|-------|-----------------|
| `npm` | `registry.npmjs.org`, `registry.yarnpkg.com` | `npm install` gets HTTP 503 |
| `github` | `github.com`, `raw.githubusercontent.com`, `codeload.github.com` | Git and release downloads fail |
| `httpbin` | `httpbin.org` | A request-echo endpoint for proving the proxy is in the path |
| Kill switch | everything | HTTP 503 on all outbound traffic |

The eight exercises call no external HTTP APIs, so the toggles do not disrupt
any Workflow as shipped. It works as an instructor demo now: flip `npm` off,
run `npm view @temporalio/client version`, watch it fail with `E503`, flip it
back.

To add a toggle: add the key and its hostnames to `SERVICE_HOSTS` in
`toggle_addon.py`, the key to `state.json`, and a label to `SERVICE_LABELS` in
`controlpanel.py`.

## Logs

| File | What |
|------|------|
| `/tmp/proxy.log` | mitmproxy |
| `/tmp/controlpanel.log` | Flask control panel |
| `/tmp/temporal-server.log` | Temporal dev server |
| `/tmp/mitm-init.log` | The throwaway run that generates the CA cert |
| `/tmp/solve-NN-worker.log` | The Worker a solve script started |
