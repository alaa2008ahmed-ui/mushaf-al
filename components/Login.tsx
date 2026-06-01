
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
    users: User[];
    onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        if (user) {
            if (user.isActive === false) {
                setError('This account has been deactivated. Please contact an administrator.');
            } else {
                onLogin(user);
            }
        } else {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-[320px] sm:max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 p-4 sm:p-6 text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Sweet Water Company Ltd</h2>
                    <p className="text-blue-100 opacity-90 text-sm sm:text-base mt-1">Daily Sales Report</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 text-red-700 text-xs sm:text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 text-sm sm:text-base rounded-lg shadow-lg transform active:scale-95 transition-all duration-150 mt-2"
                    >
                        Sign In
                    </button>
                    
                    <div className="text-center text-[10px] sm:text-xs text-gray-500 mt-3 sm:mt-4 space-y-1">
                        <p>&copy; 2026 Sweet Water Company LTD. All rights reserved.</p>
                        <p dir="ltr" className="text-gray-400 font-medium">Designed by: Alaa Ahmed</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
