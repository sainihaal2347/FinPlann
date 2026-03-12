import React from 'react';
import { Card, Button } from '../components/SharedUI';

const SettingsPage = () => (
  <div className="max-w-2xl mx-auto">
    <Card title="Account Settings">
      <p className="text-slate-500 mb-6">Manage your account preferences and MongoDB profile data.</p>
      <div className="space-y-4">
        <Button variant="outline" className="w-full">Edit Profile</Button>
        <Button variant="outline" className="w-full">Security Settings</Button>
      </div>
    </Card>
  </div>
);

export default SettingsPage;
