/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                navy: '#0F172A',
                accent: '#CA8A04',
                'accent-hover': '#A16207',
                'text-main': '#1E293B',
                somali: {
                    blue: '#4189DD',
                    green: '#10B069',
                    white: '#FFFFFF'
                }
            }
        },
    },
    plugins: [],
}
