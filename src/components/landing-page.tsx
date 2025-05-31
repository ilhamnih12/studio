import { Button } from "./ui/button";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/lib/translations";
import { Bot, ChevronRight, Code, Download, Zap, Moon, Sun, Globe, Settings2 } from "lucide-react";
import { useSettings } from "@/stores/settings";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export const LandingPage = ({
  onGetStarted
}: {
  onGetStarted: () => void;
}) => {
  const { language } = useLanguage();
  const { theme, setTheme, toggleLanguage } = useSettings();
  const t = translations[language].landing;

  return (
    <div className="h-full overflow-y-auto">
      {/* Add Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b">
        <Button 
          variant="ghost" 
          className="p-0 hover:bg-transparent"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Bot className="w-8 h-8 text-primary" />
          <span className="sr-only">WebGenius</span>
        </Button>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={toggleLanguage}>
                <Globe className="mr-2 h-4 w-4" />
                {language === 'en' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>{language === 'en' ? 'Light Mode' : 'Mode Terang'}</span>
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>{language === 'en' ? 'Dark Mode' : 'Mode Gelap'}</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Add top padding to account for fixed header */}
      <div className="pt-16">
        {/* Hero Section */}
        <section className="flex-grow flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-background to-primary/5">
          <Bot className="w-16 h-16 text-primary mb-6" />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {t.hero.title}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-8">
            {t.hero.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" onClick={onGetStarted}>
              {t.hero.getStarted} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline">
              {t.hero.watchDemo}
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{t.features.title}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {t.features.items.map((feature, i) => (
                <div key={i} className="flex flex-col items-center text-center p-6 rounded-lg bg-background shadow-sm">
                  {i === 0 && <Bot className="w-10 h-10 text-primary mb-4" />}
                  {i === 1 && <Zap className="w-10 h-10 text-primary mb-4" />}
                  {i === 2 && <Code className="w-10 h-10 text-primary mb-4" />}
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{t.howItWorks.title}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {t.howItWorks.steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center p-6">
                  <div className="text-xl font-semibold mb-3">{step.title}</div>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
