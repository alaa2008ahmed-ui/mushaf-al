
import React, { useState, useEffect, useRef } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';

// --- Helper Functions ---
const toRad = (deg) => deg * Math.PI / 180;
const toDeg = (rad) => rad * 180 / Math.PI;

function Qibla({ onBack }) {
    const { theme } = useTheme();
    const [heading, setHeading] = useState(0);
    const [qiblaDirection, setQiblaDirection] = useState(null);
    const [location, setLocation] = useState(null);
    const [error, setError] = useState('');
    
    const compassCircleRef = useRef(null);
    const qiblaPointerRef = useRef(null);

    useEffect(() => {
        // Get user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ latitude, longitude });
                    calculateQiblaDirection(latitude, longitude);
                },
                () => setError('لا يمكن الوصول للموقع. يرجى تفعيل خدمة GPS.'),
                { enableHighAccuracy: true }
            );
        } else {
            setError('خاصية تحديد الموقع غير مدعومة في هذا المتصفح.');
        }

        // Device orientation listener
        const handleOrientation = (event) => {
            let angle = event.webkitCompassHeading || Math.abs(event.alpha - 360);
            setHeading(angle);
        };

        if (window.DeviceOrientationEvent) {
             window.addEventListener('deviceorientation', handleOrientation);
        } else {
            setError('مستشعر البوصلة غير مدعوم في هذا الجهاز أو المتصفح.');
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, []);

    const calculateQiblaDirection = (latitude, longitude) => {
        const kaabaLat = 21.4225;
        const kaabaLng = 39.8262;

        const userLatRad = toRad(latitude);
        const kaabaLatRad = toRad(kaabaLat);
        const lngDiffRad = toRad(kaabaLng - longitude);

        const y = Math.sin(lngDiffRad) * Math.cos(kaabaLatRad);
        const x = Math.cos(userLatRad) * Math.sin(kaabaLatRad) - Math.sin(userLatRad) * Math.cos(kaabaLatRad) * Math.cos(lngDiffRad);
        
        let direction = toDeg(Math.atan2(y, x));
        direction = (direction + 360) % 360;
        
        setQiblaDirection(direction);
    };

    useEffect(() => {
        if (qiblaPointerRef.current) {
            const finalRotation = qiblaDirection !== null ? qiblaDirection - heading : -heading;
            qiblaPointerRef.current.style.transform = `rotate(${finalRotation}deg)`;
        }
        if (compassCircleRef.current) {
             compassCircleRef.current.style.transform = `rotate(${-heading}deg)`;
        }
    }, [heading, qiblaDirection]);

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-2xl">اتجاه القبلة</h1>
                    <p className="app-top-bar__subtitle">استخدم البوصلة لتحديد اتجاه الكعبة المشرفة</p>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 gap-4 text-center">
                 {error && <p className="themed-card p-3 rounded-lg" style={{backgroundColor: '#ef4444', color: 'white'}}>{error}</p>}
                 {qiblaDirection === null && !error && <p className="themed-text">جاري تحديد اتجاه القبلة...</p>}

                <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full flex items-center justify-center themed-card">
                    
                    {/* Compass Rose */}
                    <div ref={compassCircleRef} className="absolute w-full h-full transition-transform duration-500 ease-out">
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 text-xl font-bold" style={{color: theme.palette[0]}}>ش</div>
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -mb-2 text-base themed-text-muted">ج</div>
                         <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 text-base themed-text-muted">غ</div>
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 text-base themed-text-muted">ش</div>
                    </div>
                    
                    {/* Qibla Pointer */}
                    {qiblaDirection !== null && (
                         <div ref={qiblaPointerRef} className="absolute w-full h-full transition-transform duration-500 ease-out">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                               <path d="M50 0 L60 20 L50 15 L40 20 Z" fill={theme.palette[0]} stroke={theme.palette[1]} strokeWidth="1"/>
                            </svg>
                        </div>
                    )}
                    
                    <div className="w-3 h-3 rounded-full border-2 shadow-lg" style={{backgroundColor: theme.palette[1], borderColor: 'var(--card-bg)'}}></div>
                </div>
                
                {qiblaDirection !== null && (
                    <div className="themed-card p-3 rounded-xl">
                         <p className="text-lg font-bold">اتجاه القبلة: <span className="font-mono">{Math.round(qiblaDirection)}°</span></p>
                         <p className="text-xs themed-text-muted">قم بمحاذاة السهم الأخضر مع الخط العلوي</p>
                    </div>
                )}

            </main>
            
            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default Qibla;