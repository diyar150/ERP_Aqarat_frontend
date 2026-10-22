import { forwardRef } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { ACTION_PRESETS } from './actionPresets.js';

const baseSx = {
    textTransform: 'none',
    fontWeight: 500,
    px: 3,
    py: 0.8,
    boxShadow: 'none',
    whiteSpace: 'nowrap',
    minWidth: 'max-content',
    '&:hover': { boxShadow: 'none' },
};

/**
 * Standard admin action button.
 *
 * @example
 * <ActionButton action="add" onClick={...} />
 * <ActionButton action="report" label={t('expenses.report')} onClick={...} />
 * <ActionButton action="save" loading={isPending} onClick={...} />
 * <ActionButton action="excel" onClick={exportXlsx} />
 */
const ActionButton = forwardRef(function ActionButton(
    {
        action = 'add',
        label,
        children,
        loading = false,
        disabled = false,
        fullWidth,
        startIcon,
        endIcon,
        hideIcon = false,
        size = 'medium',
        sx = {},
        ...rest
    },
    ref,
) {
    const { t } = useTranslation();
    const preset = ACTION_PRESETS[action] || ACTION_PRESETS.add;
    const Icon = preset.icon;

    const resolvedLabel =
        label ??
        children ??
        (preset.labelKey ? t(preset.labelKey) : action);

    const iconNode = loading
        ? <CircularProgress size={16} color="inherit" />
        : hideIcon
            ? null
            : (startIcon ?? (Icon ? <Icon /> : null));

    return (
        <Button
            ref={ref}
            variant={preset.variant}
            color={preset.color}
            size={size}
            disabled={disabled || loading}
            fullWidth={fullWidth}
            startIcon={iconNode}
            endIcon={endIcon}
            sx={{
                ...baseSx,
                ...(preset.sx || {}),
                ...sx,
            }}
            {...rest}
        >
            {resolvedLabel}
        </Button>
    );
});

export default ActionButton;
