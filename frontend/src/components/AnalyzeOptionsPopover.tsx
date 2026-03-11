import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Camera, Image, Video, Mic, Link, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface AnalyzeOptionsPopoverProps {
  onOptionSelect: (type: string, data?: string) => void;
}

const AnalyzeOptionsPopover = ({ onOptionSelect }: AnalyzeOptionsPopoverProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      id: "camera",
      icon: Camera,
      label: "Camera",
      description: "Capture live image",
      action: () => {
        toast({
          title: "Camera",
          description: "Camera capture will open..."
        });
        onOptionSelect("camera");
        setIsOpen(false);
      }
    },
    {
      id: "image",
      icon: Image,
      label: "Image Upload",
      description: "Upload an image file",
      action: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            toast({
              title: "Image Selected",
              description: `Analyzing: ${file.name}`
            });
            onOptionSelect("image", file.name);
          }
        };
        input.click();
        setIsOpen(false);
      }
    },
    {
      id: "video",
      icon: Video,
      label: "Video Upload",
      description: "Upload a video file",
      action: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            toast({
              title: "Video Selected",
              description: `Analyzing: ${file.name}`
            });
            onOptionSelect("video", file.name);
          }
        };
        input.click();
        setIsOpen(false);
      }
    },
    {
      id: "audio",
      icon: Mic,
      label: "Audio Upload",
      description: "Upload an audio file",
      action: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            toast({
              title: "Audio Selected",
              description: `Analyzing: ${file.name}`
            });
            onOptionSelect("audio", file.name);
          }
        };
        input.click();
        setIsOpen(false);
      }
    },
    {
      id: "link",
      icon: Link,
      label: "Paste Link",
      description: "Analyze from URL",
      action: () => {
        const url = prompt("Enter the URL to analyze:");
        if (url) {
          toast({
            title: "Link Added",
            description: `Analyzing URL: ${url.substring(0, 50)}...`
          });
          onOptionSelect("link", url);
        }
        setIsOpen(false);
      }
    }
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-xl border-border/50 bg-background/50 hover:bg-secondary/20 hover:border-secondary/50 transition-all"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-3" 
        align="end"
        sideOffset={8}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Analyze Content</h4>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          {options.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={option.action}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/80 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <option.icon className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AnalyzeOptionsPopover;
