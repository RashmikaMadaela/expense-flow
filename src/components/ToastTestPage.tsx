'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Info, AlertTriangle, Smartphone, Monitor } from 'lucide-react';

export default function ToastTestPage() {
  const { toast } = useToast();

  const showSuccessToast = () => {
    toast({
      title: "Friend request sent!",
      description: "Your friend request has been sent successfully. They will receive a notification.",
      variant: "default",
    });
  };

  const showErrorToast = () => {
    toast({
      title: "Failed to send friend request",
      description: "Something went wrong. Please check your internet connection and try again.",
      variant: "destructive",
    });
  };

  const showAcceptToast = () => {
    toast({
      title: "Friend request accepted!",
      description: "You are now friends and can start splitting expenses together. Add your first shared expense now!",
      variant: "default",
    });
  };

  const showLongMessageToast = () => {
    toast({
      title: "Settlement completed successfully",
      description: "John has marked your $45.67 payment as settled. This amount has been removed from your debts and added as an expense entry in your transaction history for proper tracking.",
      variant: "default",
    });
  };

  const showMultipleToasts = () => {
    toast({
      title: "First notification",
      description: "This is the first toast notification.",
      variant: "default",
    });
    
    setTimeout(() => {
      toast({
        title: "Second notification",
        description: "This is the second toast notification.",
        variant: "destructive",
      });
    }, 500);
    
    setTimeout(() => {
      toast({
        title: "Third notification", 
        description: "This is the third toast notification.",
        variant: "default",
      });
    }, 1000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Toast Notification Test</h1>
        <p className="text-gray-600">Test the mobile responsiveness of toast notifications across different screen sizes.</p>
        
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800">Mobile First Design</span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
            <Monitor className="h-4 w-4 text-green-600" />
            <span className="text-green-800">Desktop Optimized</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Success Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button 
                onClick={showSuccessToast}
                className="w-full sm:w-auto"
              >
                Friend Request Sent
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                Tests standard success notification with medium-length message.
              </p>
            </div>
            
            <div>
              <Button 
                onClick={showAcceptToast}
                className="w-full sm:w-auto"
                variant="outline"
              >
                Friend Request Accepted
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                Tests success notification with longer descriptive text.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Error Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button 
                onClick={showErrorToast}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                Show Error Toast
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                Tests error notification with helpful error message.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Long Content Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button 
                onClick={showLongMessageToast}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Settlement Notification
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                Tests how toast handles longer content on mobile devices.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Multiple Toasts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button 
                onClick={showMultipleToasts}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Show Multiple Toasts
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                Tests how multiple toasts stack and display on mobile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Mobile Responsiveness Features:</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium">Adaptive Positioning</h4>
              <p className="text-sm text-gray-600">Toasts appear at top on mobile, bottom-right on desktop</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium">Touch-Friendly</h4>
              <p className="text-sm text-gray-600">Larger close buttons and touch targets for mobile</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium">Responsive Text</h4>
              <p className="text-sm text-gray-600">Font sizes adjust for optimal readability on all screens</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium">Smart Spacing</h4>
              <p className="text-sm text-gray-600">Padding and margins adapt to screen size</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          💡 <strong>Tip:</strong> Resize your browser window or test on different devices to see the responsive behavior
        </p>
      </div>
    </div>
  );
}