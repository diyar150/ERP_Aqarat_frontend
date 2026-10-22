import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TableChartIcon from '@mui/icons-material/TableChart';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import ClearIcon from '@mui/icons-material/Clear';
import ReplayIcon from '@mui/icons-material/Replay';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import BlockIcon from '@mui/icons-material/Block';
import UndoIcon from '@mui/icons-material/Undo';

/**
 * Standard action presets for admin toolbars and forms.
 * Use with <ActionButton action="add" /> etc.
 */
export const ACTION_PRESETS = {
    add: {
        variant: 'contained',
        color: 'success',
        icon: AddIcon,
        labelKey: 'common.add',
    },
    save: {
        variant: 'contained',
        color: 'success',
        icon: SaveIcon,
        labelKey: 'common.save',
    },
    update: {
        variant: 'contained',
        color: 'success',
        icon: SaveIcon,
        labelKey: 'common.update',
    },
    clear: {
        variant: 'contained',
        color: 'info',
        icon: RefreshIcon,
        labelKey: 'common.clear',
        // Soft blue used across create forms
        sx: {
            bgcolor: 'info.main',
            color: 'info.contrastText',
            '&:hover': { bgcolor: 'info.dark' },
        },
    },
    report: {
        variant: 'outlined',
        color: 'info',
        icon: AssessmentIcon,
        labelKey: 'common.report',
    },
    excel: {
        variant: 'outlined',
        color: 'success',
        icon: TableChartIcon,
        labelKey: 'common.excel',
    },
    export: {
        variant: 'outlined',
        color: 'success',
        icon: TableChartIcon,
        labelKey: 'common.export',
    },
    print: {
        variant: 'outlined',
        color: 'inherit',
        icon: PrintIcon,
        labelKey: 'common.print',
    },
    void: {
        variant: 'outlined',
        color: 'error',
        icon: BlockIcon,
        labelKey: 'finance.void',
    },
    reverse: {
        variant: 'outlined',
        color: 'warning',
        icon: UndoIcon,
        labelKey: 'finance.reverse',
    },
    edit: {
        variant: 'contained',
        color: 'primary',
        icon: EditIcon,
        labelKey: 'common.edit',
    },
    delete: {
        variant: 'contained',
        color: 'error',
        icon: DeleteIcon,
        labelKey: 'common.delete',
    },
    restore: {
        variant: 'outlined',
        color: 'success',
        icon: RestoreFromTrashIcon,
        labelKey: 'common.restore',
    },
    view: {
        variant: 'outlined',
        color: 'success',
        icon: VisibilityIcon,
        labelKey: 'common.view',
    },
    back: {
        variant: 'outlined',
        color: 'inherit',
        icon: ArrowBackIcon,
        labelKey: 'common.back',
    },
    cancel: {
        variant: 'outlined',
        color: 'inherit',
        icon: CloseIcon,
        labelKey: 'common.cancel',
    },
    refresh: {
        variant: 'outlined',
        color: 'inherit',
        icon: ReplayIcon,
        labelKey: 'common.refresh',
    },
    clearFilters: {
        variant: 'outlined',
        color: 'error',
        icon: ClearIcon,
        labelKey: 'common.clear_filters',
    },
};

export const ACTION_TYPES = Object.keys(ACTION_PRESETS);
