import fetch from '@/utils/fetch';

export const DEFAULT_SUPPLIER_NAME = 'Developed by Hiload System';

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(reader.error || new Error('Logo read failed'));
        reader.readAsDataURL(blob);
    });
}

/**
 * Loads agency branding in the shape expected by PdfReportHeader / PdfReportFooter.
 * supplier_name comes from companies.supplier_name (default: Developed by Hiload System).
 */
export async function loadPdfCompany() {
    const res = await fetch.get('agency');
    const data = res.data?.data || {};
    let logo_data_url = '';
    if (data.has_logo) {
        try {
            const file = await fetch.get('agency/logo', { responseType: 'blob' });
            if (file.data && String(file.data.type || '').startsWith('image/')) {
                logo_data_url = await blobToDataUrl(file.data);
            }
        } catch {
            logo_data_url = '';
        }
    }
    const phones = String(data.phone || '')
        .split(/::|,|;|\|/)
        .map((part) => part.trim())
        .filter(Boolean);
    const supplier = String(data.supplier_name || '').trim() || DEFAULT_SUPPLIER_NAME;
    return {
        name: data.name || '',
        legal_name: data.registration_number || data.name || '',
        tagline: data.city || '',
        phone_1: phones[0] || '',
        phone_2: phones[1] || '',
        address: [data.address, data.city].filter(Boolean).join(', '),
        supplier_name: supplier,
        logo_data_url,
        logo_1: logo_data_url,
        email: data.email || '',
        website: data.website || '',
    };
}
