import {
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
    ALIGN_OPTIONS,
    HEADING_SIZES,
    SIGNATURE_SLOT_PRESETS,
    WHEN_OPTIONS,
    blockSupportsLayout,
} from './blockCatalog.js';
import BlockColorControls from './BlockColorControls.jsx';

export default function BlockLayoutControls({ block, onChange }) {
    const { t } = useTranslation();
    const supportsLayout = blockSupportsLayout(block.type);
    const editable = block.type === 'heading' || block.type === 'paragraph' || block.type === 'clause';

    return (
        <Stack spacing={1.25} sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>{t('contracts.builder.when')}</InputLabel>
                    <Select
                        label={t('contracts.builder.when')}
                        value={block.when || 'always'}
                        onChange={(event) => onChange({ when: event.target.value })}
                    >
                        {WHEN_OPTIONS.map((value) => (
                            <MenuItem key={value} value={value}>{t(`contracts.builder.when_${value}`)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {supportsLayout && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>{t('contracts.builder.align')}</InputLabel>
                        <Select
                            label={t('contracts.builder.align')}
                            value={block.align || 'start'}
                            onChange={(event) => onChange({ align: event.target.value })}
                        >
                            {ALIGN_OPTIONS.map((value) => (
                                <MenuItem key={value} value={value}>{t(`contracts.builder.align_${value}`)}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
                {block.type === 'heading' && (
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>{t('contracts.builder.heading_size')}</InputLabel>
                        <Select
                            label={t('contracts.builder.heading_size')}
                            value={block.headingSize || 'h1'}
                            onChange={(event) => onChange({ headingSize: event.target.value })}
                        >
                            {HEADING_SIZES.map((value) => (
                                <MenuItem key={value} value={value}>{value.toUpperCase()}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
                {editable && (
                    <FormControlLabel
                        control={(
                            <Switch
                                size="small"
                                checked={Boolean(block.bold)}
                                onChange={(event) => onChange({ bold: event.target.checked })}
                            />
                        )}
                        label={<Typography variant="body2">{t('contracts.builder.bold')}</Typography>}
                    />
                )}
                {block.type === 'parties' && (
                    <FormControlLabel
                        control={(
                            <Switch
                                size="small"
                                checked={Boolean(block.showPhone)}
                                onChange={(event) => onChange({ showPhone: event.target.checked })}
                            />
                        )}
                        label={<Typography variant="body2">{t('contracts.builder.show_phone')}</Typography>}
                    />
                )}
                {block.type === 'signature' && (
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>{t('contracts.builder.signature_slots')}</InputLabel>
                        <Select
                            label={t('contracts.builder.signature_slots')}
                            value={(block.slots || ['agency', 'party']).join(',')}
                            onChange={(event) => {
                                const key = event.target.value;
                                const preset = Object.entries(SIGNATURE_SLOT_PRESETS)
                                    .find(([, slots]) => slots.join(',') === key);
                                onChange({ slots: preset ? preset[1] : key.split(',') });
                            }}
                        >
                            {Object.entries(SIGNATURE_SLOT_PRESETS).map(([key, slots]) => (
                                <MenuItem key={key} value={slots.join(',')}>
                                    {t(`contracts.builder.signature_preset_${key}`)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </Stack>
            {editable && (
                <BlockColorControls
                    textColor={block.textColor || null}
                    backgroundColor={block.backgroundColor || null}
                    onChange={onChange}
                />
            )}
        </Stack>
    );
}
