# Translation limitations (16/11/2026)

`packages/core/src/translate/` rewrites an SBOM the way another tool would have written it, and can move it between SPDX and
CycloneDX. It can only carry what the original tool wrote down: whatever a tool leaves out is lost on the way, and
the translation never makes it up. This page lists the losses that matter.

It covers Syft, Trivy and Docker Scout in both formats, Google Artifact Analysis and Microsoft's sbom-tool in SPDX,
and Amazon Inspector in its SPDX export and its SBOM Generator's CycloneDX. Syft, Trivy and Scout were checked on our
own scans; Google, Inspector and Microsoft on the SBOMVert dataset, plus a few scans with Inspector SBOM Generator and
sbom-tool. The accepted losses are pinned by `equivalenceClasses.test.ts` and `formats/convert.test.ts`.

## Syft, Trivy and Docker Scout

Syft writes the most: the whole distro release, the architecture, the source package of every OS package, and in
CycloneDX the cataloger and source as properties. Translating into Syft fills those in from what the other tool gave.
Trivy is close to Syft, but lowercases Go module paths, so their original case is lost going from Trivy to Syft.

Scout loses the most. It only writes the major distro release (`13` for Debian 13.7), puts the architecture and source
on some packages only, lowercases Go module paths and drops the `v` of Composer versions. It also lists a deb's source
package as a package of its own: translating into Scout adds those, and translating out of Scout keeps them, so a Scout
SBOM turned into Syft's form has more packages than Syft would list. On images with BuildKit attestations, Scout also
lists the packages of every build stage; outside Scout's form they can't be told apart from the final image's.

Trivy's rpm form comes from its source code, not from a real Trivy SBOM of an rpm image.

## Google, Amazon Inspector and Microsoft

Google writes only the major Debian release and Alpine's major.minor, folds a package's namespace into its name for
Go, npm, Composer and Maven, and drops the `v` of Go and Composer versions.

Inspector's SPDX export gives no distro at all (it's guessed from versions like `+deb12u1`), and gives a deb the
version and epoch of its source package rather than its own, so the installed version is lost. It also appends `-null`
to versions without a revision, and lists source packages separately, like Scout. Inspector SBOM Generator's CycloneDX
is much better: each package has its own version and source, and mainly the minor Debian release is missing.

Microsoft's sbom-tool writes a bare purl for Debian packages, with no architecture, distro or source, and no purl at
all for Alpine packages and rpms. Those are read back by name and version, and whether they're Alpine or rpm is
decided per SBOM; an rpm's distro isn't known. It lists no language packages.

## Between SPDX and CycloneDX

Packages, versions, purls, hashes, the supplier, the declared license, files, dependencies, the OS and the image cross
over. What has no place in the other format is dropped: on the SPDX side mainly other relationships, the download
location, the copyright text and annotations; on the CycloneDX side the properties of language packages, nested
components and evidence. A CycloneDX license list becomes a single SPDX expression.

## Outside the translation

Without a platform, the tools don't always scan the same one (in our scans Syft and Scout often took arm64, Trivy
amd64), so packages that depend on the architecture differ for reasons no translation can fix. Some tools are also
unreliable on their own: sbom-tool sometimes reports success with no packages on large images.
