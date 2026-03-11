import { useState } from "react";
import { 
  Share2, MessageCircle, Mail, Link, Check 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const ShareDropdown = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleWhatsApp = () => {
    const text = encodeURIComponent("Check out this fake news analysis from TruthLens!");
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("TruthLens Analysis Report");
    const body = encodeURIComponent(`Check out this fake news analysis:\n\n${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "The link has been copied to your clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy link. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end">
        <DropdownMenuItem onClick={handleWhatsApp} className="cursor-pointer">
          <MessageCircle className="w-4 h-4 mr-3 text-green-500" />
          <span>WhatsApp</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail} className="cursor-pointer">
          <Mail className="w-4 h-4 mr-3 text-blue-500" />
          <span>Email</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? (
            <Check className="w-4 h-4 mr-3 text-success" />
          ) : (
            <Link className="w-4 h-4 mr-3" />
          )}
          <span>{copied ? "Copied!" : "Copy Link"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareDropdown;
