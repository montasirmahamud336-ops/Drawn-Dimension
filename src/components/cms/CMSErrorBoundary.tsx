import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

class CMSErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CMS render error", error, info);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <h3 className="text-lg font-semibold text-destructive">CMS preview crashed</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {this.state.error.message || "An unexpected rendering error happened in this section."}
        </p>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" onClick={this.handleReset}>
            Try again
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </Button>
        </div>
      </div>
    );
  }
}

export default CMSErrorBoundary;
