import { useState, useEffect } from "react";
import { TextField } from "@mui/material";
import { formatNumber, parseNumber } from "@/utils/format";

export default function NumberInput({
    value,
    onChange,
    decimals = 3,
    forceDecimals = false,
    onKeyDown,
    inputProps: customInputProps,
    ...restProps
}) {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
        if (value !== null && value !== undefined && value !== "") {
            setDisplayValue(formatNumber(value, decimals, forceDecimals));
        } else {
            setDisplayValue("");
        }
    }, [value, decimals, forceDecimals]);

    const handleChange = (e) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue);
        
        const parsedValue = parseNumber(inputValue);
        onChange(parsedValue);
    };

    return (
        <TextField
            value={displayValue}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            inputProps={{
                inputMode: "decimal",
                ...customInputProps,
            }}
            {...restProps}
        />
    );
}