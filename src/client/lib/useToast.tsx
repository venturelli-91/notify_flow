'use client';

import { createContext, useContext, useState, useCallback } from 'react';

export interface Toast {
	id: string;
	title: string;
	description?: string;
	variant: 'default' | 'destructive' | 'success';
}

interface ToastContextType {
	toasts: Toast[];
	addToast: (toast: Omit<Toast, 'id'>) => void;
	removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
		const id = Math.random().toString(36).slice(2);
		setToasts((prev) => [...prev, { ...toast, id }]);
		// Auto-remove after 4s
		setTimeout(() => removeToast(id), 4000);
	}, [removeToast]);

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
			{children}
			<ToastContainer />
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within ToastProvider');
	}
	return context;
}

function ToastContainer() {
	const { toasts, removeToast } = useToast();

	return (
		<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`rounded-lg shadow-lg p-4 max-w-sm animate-in fade-in slide-in-from-bottom-4 ${
						toast.variant === 'default'
							? 'bg-gray-900 text-white'
							: toast.variant === 'success'
							? 'bg-green-600 text-white'
							: 'bg-red-600 text-white'
					}`}
				>
					<div className="font-medium">{toast.title}</div>
					{toast.description && (
						<div className="text-sm opacity-90 mt-1">
							{toast.description}
						</div>
					)}
					<button
						onClick={() => removeToast(toast.id)}
						className="mt-2 text-xs opacity-75 hover:opacity-100"
					>
						Dismiss
					</button>
				</div>
			))}
		</div>
	);
}
