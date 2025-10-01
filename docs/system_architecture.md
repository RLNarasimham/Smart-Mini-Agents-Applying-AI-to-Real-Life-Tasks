```mermaid
graph TD

    subgraph "User & Frontend UI"
        UI[User Interface]
    end

    subgraph "Core AI System"
        Orchestrator[Orchestrator / Agent Supervisor]
        ARE[Adaptive Reasoning Engine]
        subgraph "Specialized Agent Team"
            ResearchAgent[Research Agent]
            CodeAgent[Code Agent]
            CreativeAgent[Creative Agent]
            PlannerAgent[Planner Agent]
            ReviewerAgent[Reviewer Agent]
        end
        LLMBackbone[LLM Backbone]
    end

    subgraph "Execution Environment"
        Sandbox[agent-sandbox]
    end

    subgraph "Memory Systems"
        WorkingMemory[Working Memory]
        VectorDB[Long-Term Knowledge Base]
    end




    %% Task Initiation
    UI -- "High-level Goal/Prompt" --> Orchestrator
    Orchestrator -- "Decompose Goal" --> ARE
    ARE -- "Dynamic, Hierarchical Task Graph (plan.md)" --> WorkingMemory
    ARE -- "Planning Complete" --> Orchestrator
    WorkingMemory -- "plan.md" --> Sandbox




    %% Agent Execution Loop
    Orchestrator -- "Routes Sub-tasks" --> ResearchAgent
    Orchestrator -- "Routes Sub-tasks" --> CodeAgent
    Orchestrator -- "Routes Sub-tasks" --> CreativeAgent
    Orchestrator -- "Routes Sub-tasks" --> PlannerAgent
    Orchestrator -- "Routes Sub-tasks" --> ReviewerAgent

    ResearchAgent -- "Reason -> Act -> Observe -> Reflect" --> ARE
    CodeAgent -- "Reason -> Act -> Observe -> Reflect" --> ARE
    CreativeAgent -- "Reason -> Act -> Observe -> Reflect" --> ARE
    PlannerAgent -- "Reason -> Act -> Observe -> Reflect" --> ARE
    ReviewerAgent -- "Reason -> Act -> Observe -> Reflect" --> ARE

    ARE -- "Tool Command (e.g., execute_python_script)" --> Sandbox
    Sandbox -- "Output (stdout/stderr, screenshots, logs)" --> LLMBackbone
    Sandbox -- "Output (stdout/stderr)" --> ARE




    %% Knowledge Retrieval (RAG)
    ResearchAgent -- "Query" --> VectorDB
    VectorDB -- "Relevant Document Chunks" --> ResearchAgent
    CodeAgent -- "Query" --> VectorDB
    VectorDB -- "Relevant Document Chunks" --> CodeAgent




    %% Document Ingestion
    UI -- "User Uploads Document (PDFs, DOCX)" --> VectorDB




    %% User Feedback Loop
    Sandbox -- "Passive Observation (Screenshots, Logs)" --> UI
    UI -- "Active Intervention (Pause, Terminal, Browser Control)" --> Orchestrator
    Orchestrator -- "Pause/Control" --> Sandbox




    Orchestrator -- "Questions from Agent" --> UI



    LLMBackbone -- "Final Output" --> UI


