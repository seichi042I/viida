import React from 'react';

type LayoutProps = {
    children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div style={{ display: 'flex', textAlign: 'center' }}>
            {children}
        </div>
    );
};

export default Layout;
