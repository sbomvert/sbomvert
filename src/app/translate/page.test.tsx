import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as translation from '@sbomvert/core/translate/translateSbom';
import userEvent from '@testing-library/user-event';
import TranslatePage from './page';

jest.mock('@sbomvert/core/translate/translateSbom', () => {
  const actual = jest.requireActual('@sbomvert/core/translate/translateSbom');
  return { ...actual, translateSbom: jest.fn(actual.translateSbom) };
});

// bsdutils as Trivy 0.76.0 wrote it (public/sbom, debian:13.7)
const PURL = 'pkg:deb/debian/bsdutils@2.41.5-0%2Bdeb13u1?arch=amd64&distro=debian-13.7&epoch=1';
const spdx = (creator: string) => ({
  spdxVersion: 'SPDX-2.3',
  name: 'debian:13.7',
  creationInfo: { creators: [creator], created: '2026-11-16T00:00:00Z' },
  packages: [{ name: 'bsdutils', SPDXID: 'SPDXRef-1', versionInfo: '1:2.41.5-0+deb13u1', externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: PURL }] }],
});
const TRIVY_CDX = {
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  version: 1,
  metadata: { tools: { components: [{ type: 'application', name: 'trivy' }] } },
  components: [{ 'bom-ref': 'b', type: 'library', name: 'bsdutils', version: '1:2.41.5-0+deb13u1', purl: PURL }],
};

const fileOf = (name: string, text: string) => {
  const file = new File([text], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => text });
  return file;
};
const choose = async (name: string, text: string) => {
  fireEvent.change(screen.getByLabelText('File'), { target: { files: [fileOf(name, text)] } });
  await waitFor(() => expect(screen.getByLabelText('From')).not.toBeDisabled());
};
// the page opens on Paste JSON
const renderFileMode = () => {
  render(<TranslatePage />);
  fireEvent.click(screen.getByLabelText('File from my computer'));
};
// the dropdowns are Selectors: picking opens the menu and clicks the option
const pick = async (label: string, option: string | RegExp) => {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};
const targetLabels = async () => {
  await userEvent.click(screen.getByLabelText('Translate to'));
  const labels = (await screen.findAllByRole('option')).map(o => o.textContent);
  await userEvent.keyboard('{Escape}');
  return labels;
};
const readBlob = (blob: Blob) =>
  new Promise<string>(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });

let blobs: Blob[];
let downloads: string[];
beforeEach(() => {
  blobs = [];
  downloads = [];
  global.fetch = jest.fn();
  URL.createObjectURL = jest.fn((blob: Blob) => (blobs.push(blob), 'blob:x'));
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
});
afterEach(() => jest.restoreAllMocks());

describe('Translate SBOM page', () => {
  test('detects the tool and offers only supported targets', async () => {
    renderFileMode();
    await choose('trivy.cdx.json', JSON.stringify(TRIVY_CDX));
    expect(screen.getByLabelText('From')).toHaveTextContent('Trivy');
    expect(screen.getByText(/detected/)).toBeInTheDocument();
    const labels = (await targetLabels());
    expect(labels).toHaveLength(9);
    expect(labels).toContain('Google · SPDX');
    expect(labels).not.toContain('Google · CycloneDX');
    expect(labels).not.toContain('Trivy · CycloneDX');
  });

  test('shows a button to choose the file, then the chosen file name', async () => {
    renderFileMode();
    expect(screen.getByText('Choose a JSON file')).toBeInTheDocument();
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
    await choose('alpine.spdx.json', JSON.stringify(spdx('Tool: trivy-0.76.0')));
    expect(screen.getByText('alpine.spdx.json')).toBeInTheDocument();
  });

  test('downloads the translation', async () => {
    renderFileMode();
    await choose('alpine.spdx.json', JSON.stringify(spdx('Tool: trivy-0.76.0')));
    await pick('Translate to', 'Syft · CycloneDX');
    fireEvent.click(screen.getByRole('button', { name: 'Translate & download' }));
    await waitFor(() => expect(downloads).toEqual(['alpine.syft.cdx.json']));
    expect(JSON.parse(await readBlob(blobs[0]))).toMatchObject({ bomFormat: 'CycloneDX' });
  });

  test('lets the user change the detected tool', async () => {
    renderFileMode();
    await choose('x.json', JSON.stringify(spdx('Tool: trivy-0.76.0')));
    await pick('From', /^Syft/);
    expect(await targetLabels()).not.toContain('Syft · SPDX');
    expect(await targetLabels()).toContain('Trivy · SPDX');
  });

  test('requires a source tool when none is detected', async () => {
    renderFileMode();
    await choose('x.json', JSON.stringify(spdx('Tool: unknown-1')));
    const button = screen.getByRole('button', { name: 'Translate & download' });
    expect(screen.getByLabelText('From')).toHaveTextContent('Choose the tool');
    expect(button).toBeDisabled();
    await pick('From', /^Trivy/);
    await pick('Translate to', 'Syft · SPDX');
    expect(button).not.toBeDisabled();
  });

  test('clears a target that is no longer offered', async () => {
    renderFileMode();
    await choose('x.json', JSON.stringify(spdx('Tool: trivy-0.76.0')));
    await pick('Translate to', 'Syft · SPDX');
    await pick('From', /^Syft/);
    expect(screen.getByLabelText('Translate to')).toHaveTextContent('Choose a target');
    expect(screen.getByRole('button', { name: 'Translate & download' })).toBeDisabled();
  });

  test('rejects a file that is not an SBOM', async () => {
    renderFileMode();
    fireEvent.change(screen.getByLabelText('File'), { target: { files: [fileOf('a.json', '{"a":1}')] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Not an SPDX or CycloneDX SBOM');
    fireEvent.change(screen.getByLabelText('File'), { target: { files: [fileOf('b.json', 'panic')] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/JSON/));
    expect(screen.getByLabelText('From')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Translate & download' })).toBeDisabled();
  });

  test('shows a translator error and downloads nothing', async () => {
    (translation.translateSbom as jest.Mock).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    renderFileMode();
    await choose('x.json', JSON.stringify(spdx('Tool: trivy-0.76.0')));
    await pick('Translate to', 'Syft · SPDX');
    fireEvent.click(screen.getByRole('button', { name: 'Translate & download' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(downloads).toEqual([]);
  });

  test('warns when the chosen tool is not the detected one', async () => {
    renderFileMode();
    await choose('x.json', JSON.stringify(spdx('Tool: trivy-0.76.0')));
    expect(screen.queryByText(/not the detected tool/i)).toBeNull();
    await pick('From', /^Google/);
    expect(screen.getByText(/not the detected tool \(Trivy\)/i)).toBeInTheDocument();
  });

  test('keeps the download link alive until the download has started', async () => {
    renderFileMode();
    await choose('alpine.spdx.json', JSON.stringify(spdx('Tool: trivy-0.76.0')));
    await pick('Translate to', 'Syft · CycloneDX');
    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Translate & download' }));
      expect(downloads).toEqual(['alpine.syft.cdx.json']);
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      jest.runAllTimers();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    } finally {
      jest.useRealTimers();
    }
  });

  describe('a stored SBOM', () => {
    const list = { containers: [{ name: 'alpinetwodots3.24.4', files: [{ name: 'trivy.cdx.json' }] }], pagination: { totalPages: 1 } };
    const stored = (sbom: Response | object) =>
      (global.fetch as jest.Mock).mockImplementation(async (url: string) =>
        url.startsWith('/api/sbom-files') ? { ok: true, json: async () => list } : 'status' in sbom ? sbom : { ok: true, text: async () => JSON.stringify(sbom) }
      );
    // the images the Image field suggests while typing
    const suggestions = () => Array.from(document.querySelectorAll('#translate-images option')).map(o => (o as HTMLOptionElement).value);
    const type = (text: string) => fireEvent.change(screen.getByLabelText('Image'), { target: { value: text } });
    const pickStored = async () => {
      render(<TranslatePage />);
      fireEvent.click(screen.getByLabelText('Stored SBOM'));
      type('alpine');
      await waitFor(() => expect(suggestions()).toEqual(['alpine:3.24.4']));
      type('alpine:3.24.4');
      await waitFor(() => expect(screen.getByLabelText('Stored file')).not.toBeDisabled());
      await pick('Stored file', 'trivy.cdx.json');
    };

    test('suggests images while the user types, by their name as shown', async () => {
      stored(TRIVY_CDX);
      render(<TranslatePage />);
      fireEvent.click(screen.getByLabelText('Stored SBOM'));
      type('library/nginx:1.2');
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith('/api/sbom-files?page=1&search=libraryslashnginxtwodots1.2')
      );
      type('alp');
      await waitFor(() => expect(suggestions()).toEqual(['alpine:3.24.4']));
      expect(screen.getByLabelText('Stored file')).toBeDisabled();
    });

    test('loads it and names the download after the image', async () => {
      stored(TRIVY_CDX);
      await pickStored();
      await waitFor(() => expect(screen.getByLabelText('From')).toHaveTextContent('Trivy'));
      expect(global.fetch).toHaveBeenCalledWith('/api/sbom/alpinetwodots3.24.4/trivy.cdx.json');
      await pick('Translate to', 'Syft · SPDX');
      fireEvent.click(screen.getByRole('button', { name: 'Translate & download' }));
      await waitFor(() => expect(downloads).toEqual(['alpine-3.24.4.syft.spdx.json']));
    });

    test('switching to a local file drops the stored SBOM', async () => {
      stored(TRIVY_CDX);
      await pickStored();
      await waitFor(() => expect(screen.getByLabelText('From')).toHaveTextContent('Trivy'));
      fireEvent.click(screen.getByLabelText('File from my computer'));
      expect(screen.getByLabelText('From')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Translate & download' })).toBeDisabled();
    });

    test('a stored SBOM that arrives after the user switched to a local file is ignored', async () => {
      let resolve: (r: object) => void = () => {};
      (global.fetch as jest.Mock).mockImplementation((url: string) =>
        url.startsWith('/api/sbom-files') ? Promise.resolve({ ok: true, json: async () => list }) : new Promise(r => (resolve = r))
      );
      await pickStored();
      fireEvent.click(screen.getByLabelText('File from my computer'));
      await choose('local.spdx.json', JSON.stringify(spdx('Tool: syft-1.54.1')));
      const text = jest.fn(async () => JSON.stringify(TRIVY_CDX));
      resolve({ ok: true, text });
      await waitFor(() => expect(text).toHaveBeenCalled());
      await act(async () => new Promise(r => setTimeout(r, 10)));
      expect(screen.getByLabelText('From')).toHaveTextContent('Syft');
    });

    test('an older suggestion list does not replace a newer one', async () => {
      const pending: Record<string, (r: object) => void> = {};
      (global.fetch as jest.Mock).mockImplementation(
        (url: string) => new Promise(r => (pending[new URL(url, 'http://x').searchParams.get('search') ?? ''] = r))
      );
      render(<TranslatePage />);
      fireEvent.click(screen.getByLabelText('Stored SBOM'));
      type('nginx');
      await waitFor(() => expect(pending.nginx).toBeDefined());
      const reply = (names: string[]) => ({ ok: true, json: async () => ({ containers: names.map(name => ({ name, files: [] })), pagination: { totalPages: 1 } }) });
      pending.nginx(reply(['nginxtwodots1.31.8']));
      await waitFor(() => expect(suggestions()).toEqual(['nginx:1.31.8']));
      pending[''](reply(['alpinetwodots3.24.4', 'nginxtwodots1.31.8']));
      await act(async () => new Promise(r => setTimeout(r, 10)));
      expect(suggestions()).toEqual(['nginx:1.31.8']);
    });

    test('changing the typed image unselects the previous one', async () => {
      stored(TRIVY_CDX);
      await pickStored();
      type('alpine:3.24');
      await waitFor(() => expect(screen.getByLabelText('Stored file')).toBeDisabled());
    });

    test('shows an error when it cannot be loaded', async () => {
      stored({ ok: false, status: 404 } as Response);
      await pickStored();
      expect(await screen.findByRole('alert')).toHaveTextContent('404');
    });
  });

  test('translates pasted JSON into the output box', async () => {
    render(<TranslatePage />);
    expect(screen.getByLabelText('Paste JSON')).toBeChecked();
    fireEvent.change(screen.getByLabelText('SBOM'), { target: { value: '{' } });
    expect(screen.getByRole('alert')).toHaveTextContent('not valid JSON');
    fireEvent.change(screen.getByLabelText('SBOM'), { target: { value: JSON.stringify(spdx('Tool: trivy-0.76.0')) } });
    expect(screen.getByLabelText('From')).toHaveTextContent('Trivy');
    await pick('Translate to', 'Syft · CycloneDX');
    fireEvent.click(screen.getByRole('button', { name: 'Translate' }));
    expect(JSON.parse((screen.getByLabelText('Translation') as HTMLTextAreaElement).value)).toMatchObject({ bomFormat: 'CycloneDX' });
    expect(downloads).toEqual([]);
  });
});
