# Git Workflow Manager - Porting & Future

> Porting notes and future considerations. See [REQUIREMENTS.md](REQUIREMENTS.md) for overview.

---

## Python Port TODO

> ⚠️ After completing TypeScript implementation, port to Python using this document.

### Porting Checklist

When porting to Python:

- [ ] Create `pyproject.toml` with dependencies
- [ ] Port CLI commands to Python
- [ ] Use `GitPython` or `dulwich` instead of CLI wrapping
- [ ] Create Python-specific unit tests
- [ ] Create Python E2E test setup
- [ ] Update README with pip install instructions

### Python Dependencies

```toml
[project]
name = "git-workflow-manager"
version = "1.0.0"
dependencies = [
    "click>=8.0",
    "GitPython>=3.1",
    "requests>=2.28",
    "PyYAML>=6.0",
]
```

### GitPython vs CLI

| Approach | Pros | Cons |
|----------|------|------|
| GitPython | Full API, testable | Learning curve |
| CLI wrapper | Simple | Less testable |

> **Recommendation:** Use GitPython for better testability.

---

## Future Considerations

| Feature | Description | Priority |
|---------|-------------|----------|
| Multi-upstream | Support multiple upstream remotes | Low |
| SVN support | Add Subversion support | Low |
| Gerrit | Support Gerrit code review | Low |
| Bitbucket | Add Bitbucket support | Low |
| Webhooks | Receive push/PR webhooks | Medium |
| GUI | Optional web/tui interface | Low |

---

## Contributing

To add a new feature:

1. Add requirement to [REQUIREMENTS-FEATURES.md](REQUIREMENTS-FEATURES.md) with ID
2. Update [REQUIREMENTS-CLI.md](REQUIREMENTS-CLI.md) if CLI changes
3. Implement in TypeScript
4. Add tests to [REQUIREMENTS-TESTING.md](REQUIREMENTS-TESTING.md)
5. Update porting notes if language changes

---

*See [REQUIREMENTS-FEATURES.md](REQUIREMENTS-FEATURES.md) for feature requirements.*
