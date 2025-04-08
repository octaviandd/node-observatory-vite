import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Folder, ExternalLink, ChevronUp, ChevronDown } from "lucide-react"
import { Link } from "react-router"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useState } from "react"
import { formatDate } from "@/utils.js"

export const BaseCard = ({
  date,
  metadata,
  content,
  file,
  line,
  package: pkg,
  linkPath,
  language = "json"
}: {
  date: string
  metadata?: string
  content: any
  file: string
  line: string
  package?: string
  linkPath?: string
  language?: string
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-card">
      <CardHeader className="flex-row justify-between items-center space-y-0">
        <span className="text-sm font-medium text-muted-foreground">
          {formatDate(date)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          {linkPath && (
            <Button variant="ghost" size="icon" asChild>
              <Link to={linkPath}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <>
          <CardContent className="pb-2">
            <SyntaxHighlighter
              language={language}
              style={materialDark}
              wrapLines={true}
              lineProps={{
                style: { wordBreak: "break-all", whiteSpace: "pre-wrap" }
              }}
            >
              {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
            </SyntaxHighlighter>
          </CardContent>
          <CardFooter className="justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Folder className="h-4 w-4" />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap w-[250px]">{file}:{line}</span>
            </div>
            {pkg && <span className="whitespace-nowrap text-sm">{pkg}</span>}
          </CardFooter>
        </>
      )}
    </Card>
  )
}