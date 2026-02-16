import { Button } from "@/modules/core/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/core/components/ui/tooltip";
import { CircleHelp } from "lucide-react";

export default function GraphExplainer({
  description,
  link,
}: {
  description: string;
  link?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <Button variant={"ghost"} className="ignore h-6 w-6 p-0">
            <CircleHelp className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] border border-black/10 bg-white py-2 text-foreground shadow-sm">
          <p className="whitespace-pre-line font-medium">
            {description}
            {link && (
              <>
                <br />
                <a
                  href={link}
                  target="_blank"
                  className="mt-1 block text-primary underline"
                >
                  Læs mere
                </a>
              </>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
