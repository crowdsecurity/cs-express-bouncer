# How to publish

View the existing version number

```bash
gh release view
```

Create the new version number

```bash
export NEW_VERSION=X.X.X
```

```bash
gh release create v${NEW_VERSION} --title v${NEW_VERSION} --draft
```

Create the NPM version

```bash
npm version from-git
npm publish
```
