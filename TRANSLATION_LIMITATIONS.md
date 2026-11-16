# Translation limitations (16/11/2026)

What is lost or changed when `src/lib/sbom/translate/` translates an SBOM from one tool's form to another's, or from
SPDX to CycloneDX and back. Scope: **Syft** (Anchore), **Trivy** and **Docker Scout**, in SPDX and CycloneDX.

Everything here was seen on live scans (Syft 1.54.1, Trivy 0.76.0, Docker Scout 1.18.1) and
is pinned by the tests: `equivalenceClasses.test.ts` (every class from every tool, in every format, to every tool) and `formats/convert.test.ts`. Each loss the tests accept is listed in `comparable`, `sourceOf` and `lostThrough` there. "Not verified" says what was not checked.

## At a glance

| From → to | What is lost |
|---|---|
| Scout → Syft or Trivy | a deb's or apk's source and architecture, the minor distro release, Go module paths, the `v` of Composer versions; Scout's source packages stay as packages of their own |
| Trivy → Syft | Go module paths |
| Syft or Trivy → Scout | the architecture where Scout writes none; Go module paths in lower case; Composer `v`; build stages can't be told apart |
| SPDX ↔ CycloneDX | each format's fields the other has no place for (see below) |

Going there and back through a tool loses what that tool can't hold: through Scout, the architecture, source and minor release; through Trivy or Scout, the case of Go module paths.

## Docker Scout

- **No minor release.** Scout writes `os_version=13` for Debian 13.7 and `9` for Oracle Linux 9.8 (Alpine: `3.24`, Ubuntu: the whole `26.04`). From Scout, another tool gets `distro=debian-13` where it would write `debian-13.7`.
- **No source, and the architecture on some packages only.** Scout puts `arch=` and `upstream=` on part of its deb and apk purls only. Read from Scout, the other packages have no source: Trivy's `sourceInfo` and `Src*` properties and Syft's source properties can't be written for them.
- **Source packages listed separately.** Scout lists a deb's source package as a package of its own when its name differs (`ncurses` besides `libtinfo6`).
- **To Scout:** the translation adds that package (`docker.ts` `extras`), once per source, not again when the SBOM already lists it.
- **From Scout:** Syft and Trivy don't list source packages, but Scout writes them as packages of their own, so a Scout SBOM translated to Syft has more packages than Syft's would.
- **The copy:** the source package is a copy of the first binary built from it, with its own id, name, purl and version. It also keeps that binary's supplier, license, checksums and copyright (SPDX), or its licenses, hashes and properties (CycloneDX); only the CPE and nested files are dropped.
- **Go module paths in lower case** (`github.com/defanglabs/...`; Syft: `DefangLabs`). Written as Scout, they are lowercased; from Scout, the case is lost.
- **Go versions:** without their `v`, except in the purls of Scout's SPDX SBOMs, where every Go version has one, stdlib's too (`pkg:golang/stdlib@v1.26.10`, version `1.26.10`). Read from Scout, a module gets its `v` back and stdlib none, as Syft writes them.
- **Composer versions without their `v`** (Syft: with one, on about half). From Scout, the `v` is lost.
- **`UNKNOWN` for a missing version** (seen on golang and maven). Read from Scout, it means no version.
- **Build stages:** on an image with BuildKit attestations, Scout lists the packages of every Dockerfile stage, marked `stage=<name>`. Written as Scout they keep `stage`; written as another tool they lose it, and can't be told apart from the final image's packages.


## Trivy

- **Go module paths in lower case**. From Trivy to Syft the case is lost.
- A package with no version gets none.
- **Whole release kept.** Trivy writes `distro=debian-13.7`; Syft and Scout writers take the whole release when there is one.
- **CycloneDX:** the source is in the `aquasecurity:trivy:SrcName`/`SrcEpoch`/`SrcVersion`/`SrcRelease` properties (an Alpine source has no release), the OS is an `operating-system` component.
- **Order of properties:** an OS package from another tool keeps that tool's properties, with Trivy's after them.
- **The OS component** is added first with the id `operating-system` (Trivy's own has a random UUID and isn't always first). Syft's own OS component is kept, so none is added.
- **Family names:** only four differ from the os-release id (`oracle`/`ol`, `redhat`/`rhel`, `amazon`/`amzn`,`alma`/`almalinux`); others pass through unchanged.
- **Unknown source:** an rpm whose source rpm isn't known (Syft's `gpg-pubkey`) gets no `sourceInfo` written as Trivy, where Trivy would list the package itself.

## Syft

- **Whole release.** Syft 1.54.1 writes the whole release (`debian-13.7`, `alpine-3.24.4`, `ol-9.8`) in purls and in its OS component, so Trivy → Syft keeps it. Older Syft versions wrote `debian-12` only; the translation writes the newer form.
- **CycloneDX properties:** Syft gives an OS package's cataloger and source in properties (`syft:package:foundBy`, `type`, `metadataType`; deb `syft:metadata:source`/`sourceVersion`, apk `originPackage`, rpm `epoch`/`release`/`sourceRpm`) and lists the OS as a component with `syft:distro:*` properties. Another tool's OS package written as Syft gets them, from hard-coded cataloger names per type.


## Packages not from the OS

The properties of a language package (Syft's cataloger, Trivy's `PkgType` such as `gobinary` or `gomod`) depend on how
the tool found it, so no writer makes them up: they are lost going to another tool, and through one and back.

## Between SPDX and CycloneDX


**Carried over:** ids, names, versions, purls, the first CPE, supplier, hashes, the declared license, files,
`DEPENDS_ON`, the OS and the image (SPDX's `CONTAINER` package, CycloneDX's metadata component), the tools and the time.

**Lost from SPDX:** relationships other than `DEPENDS_ON` and `DESCRIBES`, `downloadLocation`, `homepage`,
`copyrightText`, `licenseConcluded` (the declared license is kept), comments, annotations, any CPE after the first.

**Lost from CycloneDX:** properties of packages not from the OS, nested components (Scout's files), evidence, external
references. A license list becomes one SPDX expression, and a license name a `LicenseRef-`.


## Outside the translation

These affect comparing tools, but no translation can fix them:

- **Platform.** With no platform given, the tools don't always scan the same one: on many images, Syft and Scout scanned arm64 and Trivy amd64 (inferred from the purls' `arch`). Packages whose name or version depends on the architecture then don't match; the tests leave `arch` out of the comparison.
