import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VerificationPendingProps {
  email: string;
  onBack: () => void;
}

export default function VerificationPending({ email, onBack }: VerificationPendingProps) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { toast } = useToast();

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: '發送失敗',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setResent(true);
        toast({
          title: '驗證信已重新寄出',
          description: '請檢查您的收件匣',
        });
        setTimeout(() => setResent(false), 30000);
      }
    } catch {
      toast({
        title: '發送失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/50 shadow-2xl overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-amber-500 to-amber-400" />
      <CardHeader className="text-center space-y-4 pt-8 pb-2">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-foreground">
            驗證信已寄出！
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            我們已將驗證連結發送至
          </p>
          <p className="text-foreground font-medium bg-muted/50 rounded-lg py-2 px-4 inline-block text-sm">
            {email}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pb-8">
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              請前往您的信箱，點擊驗證連結以完成註冊
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              如果在收件匣中找不到，請檢查<span className="text-foreground font-medium">垃圾郵件</span>資料夾
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              驗證成功後即可登入，開始您的攝影之旅
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={resending || resent}
            variant="gold"
            className="w-full"
          >
            {resending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                發送中...
              </>
            ) : resent ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                已重新寄出，請稍候再試
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                沒收到信？重新發送
              </>
            )}
          </Button>

          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回登入
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
