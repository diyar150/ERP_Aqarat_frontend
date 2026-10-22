/**
 * @deprecated Prefer <ActionButton action="clear" />.
 * Kept for existing form screens.
 */
import ActionButton from './ActionButton.jsx';

export default function ClearButton({ onClick, disabled, label, fullWidth, sx = {} }) {
    return (
        <ActionButton
            action="clear"
            onClick={onClick}
            disabled={disabled}
            label={label}
            fullWidth={fullWidth}
            sx={sx}
        />
    );
}
