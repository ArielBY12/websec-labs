# Labs

Each lab is a self-contained folder following this structure:

```
NN-name/
├── lab.json          # metadata (auto-read by the hub dashboard)
├── README.md         # the writeup: vuln · exploit · root cause · fix
├── vulnerable/       # Express app with the insecure pattern
├── fixed/            # same app, secured
├── exploit/          # PoC + automated test (proves vuln fails, fixed holds)
└── docker-compose.yml
```

## Create a new lab

```bash
./scripts/new-lab.sh 02-xss-reflected
```

This copies `_template/` and you fill in the blanks.

## The lab.json schema

| field | type | notes |
|-------|------|-------|
| `id` | string | folder name, e.g. `01-sqli` |
| `title` | string | display name |
| `level` | number | 1–5 |
| `owasp` | string | OWASP category (optional) |
| `category` | string | vuln family |
| `difficulty` | `easy`\|`medium`\|`hard` | |
| `status` | `todo`\|`in-progress`\|`done` | drives the dashboard dot |
| `port` | number | base port for the vulnerable app |
| `summary` | string | one-liner |
| `tags` | string[] | for filtering |
