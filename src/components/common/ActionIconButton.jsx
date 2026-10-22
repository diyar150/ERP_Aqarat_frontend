import { forwardRef } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';
import { ACTION_PRESETS } from './actionPresets.js';

/**
 * Compact icon button for table row actions (view / edit / delete / …).
 *
 * @example
 * <ActionIconButton action="edit" onClick={...} />
 * <ActionIconButton action="delete" onClick={...} />
 */
const ActionIconButton = forwardRef(function ActionIconButton(
    {
        action = 'edit',
        label,
        title,
        size = 'small',
        disabled = false,
        sx = {},
        ...rest
    },
    ref,
) {
    const { t } = useTranslation();
    const preset = ACTION_PRESETS[action] || ACTION_PRESETS.edit;
    const Icon = preset.icon;
    const tip = title ?? label ?? (preset.labelKey ? t(preset.labelKey) : action);

    // Map contained presets to sensible icon colors
    const color =
        action === 'delete' || action === 'clearFilters' || action === 'void'
            ? 'error'
            : action === 'reverse'
                ? 'warning'
                : action === 'view' || action === 'add' || action === 'save' || action === 'excel' || action === 'restore'
                    ? 'success'
                    : action === 'edit' || action === 'report'
                        ? 'info'
                        : 'default';

    const button = (
        <IconButton
            ref={ref}
            size={size}
            color={color}
            disabled={disabled}
            aria-label={typeof tip === 'string' ? tip : action}
            sx={sx}
            {...rest}
        >
            {Icon ? <Icon fontSize="small" /> : null}
        </IconButton>
    );

    if (!tip) return button;
    return <Tooltip title={tip}>{button}</Tooltip>;
});

export default ActionIconButton;
