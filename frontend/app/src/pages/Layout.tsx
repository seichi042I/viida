import React from 'react';

type LayoutProps = {
    children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="bg-black min-h-screen flex flex-col p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
            {children}
        </div>
    );
};

export default Layout;
