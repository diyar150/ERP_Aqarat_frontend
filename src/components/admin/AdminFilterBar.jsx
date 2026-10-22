import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export default function AdminFilterBar({ startDate, endDate, onDateChange }) {
    const { t } = useTranslation();
    const [preset, setPreset] = useState("today");

    // Helper to convert and format value to string (YYYY-MM-DD)
    const formatDateStr = (val) => {
        if (!val) return "";
        if (dayjs.isDayjs(val)) return val.isValid() ? val.format("YYYY-MM-DD") : "";
        const d = dayjs(val);
        return d.isValid() ? d.format("YYYY-MM-DD") : "";
    };

    // Synchronize local preset state when parent startDate/endDate change
    useEffect(() => {
        const startStr = formatDateStr(startDate);
        const endStr = formatDateStr(endDate);

        if (!startStr && !endStr) {
            setPreset("all");
            return;
        }

        const today = dayjs().format("YYYY-MM-DD");
        const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
        const last7 = dayjs().subtract(7, "day").format("YYYY-MM-DD");
        const lastMonth = dayjs().subtract(30, "day").format("YYYY-MM-DD");

        if (startStr === today && endStr === today) {
            setPreset("today");
        } else if (startStr === yesterday && endStr === yesterday) {
            setPreset("yesterday");
        } else if (startStr === last7 && endStr === today) {
            setPreset("last_7_days");
        } else if (startStr === lastMonth && endStr === today) {
            setPreset("last_month");
        } else {
            setPreset("custom");
        }
    }, [startDate, endDate]);

    const applyPreset = (value) => {
        setPreset(value);
        if (value === "custom") return;

        let fromStr = "";
        let toStr = "";

        if (value !== "all") {
            const today = dayjs();
            let from, to;

            switch (value) {
                case "today":
                    from = to = today;
                    break;
                case "yesterday":
                    from = to = today.subtract(1, "day");
                    break;
                case "last_7_days":
                    from = today.subtract(7, "day");
                    to = today;
                    break;
                case "last_month":
                    from = today.subtract(30, "day");
                    to = today;
                    break;
                default:
                    return;
            }

            fromStr = from.format("YYYY-MM-DD");
            toStr = to.format("YYYY-MM-DD");
        }

        onDateChange(fromStr, toStr);
    };

    const handleCustomDateChange = (type, val) => {
        const dateStr = val && dayjs(val).isValid() ? val.format("YYYY-MM-DD") : "";
        if (type === "start") {
            onDateChange(dateStr, formatDateStr(endDate));
        } else {
            onDateChange(formatDateStr(startDate), dateStr);
        }
    };

    // Helper to convert start/end values into Day.js object for MUI DatePicker
    const toDayjsValue = (val) => {
        if (!val) return null;
        const d = dayjs(val);
        return d.isValid() ? d : null;
    };

    return (
        <Box sx={{ display: "contents" }}>
            <FormControl size="small" sx={{ flex: 1, minWidth: { xs: "100%", lg: 0 } }}>
                <InputLabel id="admin-preset-label">{t("common.search_date")}</InputLabel>
                <Select
                    labelId="admin-preset-label"
                    value={preset}
                    label={t("common.search_date")}
                    onChange={(e) => applyPreset(e.target.value)}
                >
                    <MenuItem value="all">{t("common.all")}</MenuItem>
                    <MenuItem value="today">{t("dashboard.today")}</MenuItem>
                    <MenuItem value="yesterday">{t("dashboard.yesterday")}</MenuItem>
                    <MenuItem value="last_7_days">{t("dashboard.last_7_days")}</MenuItem>
                    <MenuItem value="last_month">{t("dashboard.last_month")}</MenuItem>
                    <MenuItem value="custom">{t("dashboard.custom")}</MenuItem>
                </Select>
            </FormControl>

            {preset === "custom" && (
                <>
                    <Box sx={{ flex: 1, minWidth: { xs: "100%", lg: 0 } }}>
                        <DatePicker
                            label={t("dashboard.date_from")}
                            value={toDayjsValue(startDate)}
                            onChange={(val) => handleCustomDateChange("start", val)}
                            slotProps={{ textField: { size: "small", fullWidth: true } }}
                        />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: { xs: "100%", lg: 0 } }}>
                        <DatePicker
                            label={t("dashboard.date_to")}
                            value={toDayjsValue(endDate)}
                            onChange={(val) => handleCustomDateChange("end", val)}
                            slotProps={{ textField: { size: "small", fullWidth: true } }}
                        />
                    </Box>
                </>
            )}
        </Box>
    );
}
