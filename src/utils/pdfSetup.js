import { Font, pdf } from '@react-pdf/renderer';

let registeredVersion = 0;
const FONT_SETUP_VERSION = 3;
let renderChain = Promise.resolve();

/**
 * Register report fonts once. Bold faces must be registered — otherwise
 * @react-pdf/renderer hangs forever when styles use fontWeight: 'bold'.
 *
 * Always prefer Unicode families: agency data (names, addresses, titles) is
 * often Arabic/Kurdish even when the UI language is English. OpenSans alone
 * shows missing glyphs as boxes / question marks.
 */
export function ensurePdfFonts() {
    if (registeredVersion === FONT_SETUP_VERSION) return;
    registeredVersion = FONT_SETUP_VERSION;
    try {
        Font.register({
            family: 'Rudaw',
            fonts: [
                { src: '/fonts/rudawregular2.ttf', fontWeight: 'normal' },
                { src: '/fonts/rudawbold.ttf', fontWeight: 'bold' },
            ],
        });
        Font.register({
            family: 'NotoNaskhArabic',
            fonts: [
                { src: '/fonts/NotoNaskhArabic-Regular.ttf', fontWeight: 'normal' },
                { src: '/fonts/NotoNaskhArabic-Bold.ttf', fontWeight: 'bold' },
            ],
        });
        // OpenSans-Bold is not shipped; map bold to regular so LTR Latin still renders.
        Font.register({
            family: 'OpenSans',
            fonts: [
                { src: '/fonts/OpenSans-Regular.ttf', fontWeight: 'normal' },
                { src: '/fonts/OpenSans-Regular.ttf', fontWeight: 'bold' },
            ],
        });
        Font.registerHyphenationCallback((word) => [word]);
    } catch {
        // Viewer still renders with the built-in Helvetica family.
    }
}

/**
 * Unicode-capable family for mixed Arabic / Kurdish / Latin ERP content.
 * Rudaw covers Latin + Arabic-script Kurdish/Arabic used in agency data even
 * when the UI language is English (OpenSans alone shows "????" / tofu).
 */
export function pdfFontFamily(_isRTL = false) {
    ensurePdfFonts();
    return 'Rudaw';
}

async function resetPdfFonts() {
    registeredVersion = 0;
    ensurePdfFonts();
}

async function renderOnce(documentOrFactory) {
    ensurePdfFonts();
    const documentElement =
        typeof documentOrFactory === 'function' ? documentOrFactory() : documentOrFactory;
    return pdf(documentElement).toBlob();
}

/**
 * Serialize react-pdf renders and retry once after font reset.
 * Prefer a factory so retries get a fresh element tree.
 */
export function renderPdfToBlob(documentOrFactory) {
    const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        try {
            return await renderOnce(documentOrFactory);
        } catch (firstError) {
            console.warn('[pdfSetup] render failed, resetting fonts and retrying', firstError);
            await resetPdfFonts();
            await new Promise((resolve) => setTimeout(resolve, 100));
            return renderOnce(documentOrFactory);
        }
    };

    const next = renderChain.then(run, run);
    renderChain = next.then(
        () => undefined,
        () => undefined,
    );
    return next;
}
