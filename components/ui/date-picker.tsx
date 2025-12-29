"use client";

import * as React from "react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
	date?: Date;
	onSelect: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	/** Use dropdown selectors for year and month (recommended for birth dates) */
	useDropdowns?: boolean;
	/** Start year for dropdown (default: 1900) */
	fromYear?: number;
	/** End year for dropdown (default: current year) */
	toYear?: number;
}

export function DatePicker({
	date,
	onSelect,
	placeholder = "DD/MM/AAAA",
	disabled = false,
	className,
}: DatePickerProps) {
	const [inputValue, setInputValue] = React.useState("");
	const [isValid, setIsValid] = React.useState(true);

	// Sync input with date prop
	React.useEffect(() => {
		if (date) {
			setInputValue(format(date, "dd/MM/yyyy"));
			setIsValid(true);
		} else {
			setInputValue("");
			setIsValid(true);
		}
	}, [date]);

	const parseDate = (value: string): Date | null => {
		// Remove any non-digit characters
		const digits = value.replace(/\D/g, "");

		// Try to parse different formats
		if (digits.length === 8) {
			// DDMMYYYY or DDMMAAAA
			const day = parseInt(digits.substring(0, 2), 10);
			const month = parseInt(digits.substring(2, 4), 10);
			const year = parseInt(digits.substring(4, 8), 10);

			// Validate ranges
			if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
				const newDate = new Date(year, month - 1, day);
				// Check if the date is valid (handles invalid dates like 31/02)
				if (newDate.getFullYear() === year && newDate.getMonth() === month - 1 && newDate.getDate() === day) {
					return newDate;
				}
			}
		}

		// Try parsing with slashes or dashes
		const parts = value.split(/[\/\-]/);
		if (parts.length === 3) {
			const day = parseInt(parts[0], 10);
			const month = parseInt(parts[1], 10);
			const year = parseInt(parts[2], 10);

			if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
				const newDate = new Date(year, month - 1, day);
				if (newDate.getFullYear() === year && newDate.getMonth() === month - 1 && newDate.getDate() === day) {
					return newDate;
				}
			}
		}

		return null;
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setInputValue(value);

		if (!value) {
			onSelect(undefined);
			setIsValid(true);
			return;
		}

		// Try to parse the date
		const parsedDate = parseDate(value);
		if (parsedDate) {
			onSelect(parsedDate);
			setIsValid(true);
		} else {
			// Don't clear the date immediately, wait for blur
			setIsValid(false);
		}
	};

	const handleBlur = () => {
		if (!inputValue) {
			setIsValid(true);
			return;
		}

		const parsedDate = parseDate(inputValue);
		if (parsedDate) {
			// Format the date nicely on blur
			setInputValue(format(parsedDate, "dd/MM/yyyy"));
			setIsValid(true);
		} else {
			// Invalid date - reset to previous valid date or empty
			if (date) {
				setInputValue(format(date, "dd/MM/yyyy"));
			} else {
				setInputValue("");
			}
			setIsValid(true);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// Allow: backspace, delete, tab, escape, enter
		if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
			return;
		}
		// Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
		if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
			return;
		}
		// Allow: home, end, left, right
		if (e.keyCode >= 35 && e.keyCode <= 39) {
			return;
		}
		// Only allow numbers and slashes
		if (
			!(e.keyCode >= 48 && e.keyCode <= 57) && // 0-9
			!(e.keyCode >= 96 && e.keyCode <= 105) && // numpad 0-9
			e.keyCode !== 191 && // /
			e.keyCode !== 111 && // numpad /
			e.keyCode !== 189 && // -
			e.keyCode !== 109 // numpad -
		) {
			e.preventDefault();
		}
	};

	return (
		<Input
			type="text"
			value={inputValue}
			onChange={handleChange}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
			placeholder={placeholder}
			disabled={disabled}
			className={cn(className, !isValid && "border-red-500")}
			maxLength={10}
		/>
	);
}
