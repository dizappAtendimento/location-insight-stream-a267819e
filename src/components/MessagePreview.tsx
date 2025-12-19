import { useMemo } from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface MessageItem {
  id: number;
  text: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | null;
  mediaUrl: string | null;
  mediaName: string | null;
}

interface MessagePreviewProps {
  messages: MessageItem[];
  contactName?: string;
}

export function MessagePreview({ messages, contactName = 'Contato Exemplo' }: MessagePreviewProps) {
  // Render message with variables replaced
  const renderMessageText = (text: string) => {
    if (!text) return null;
    
    // Replace variables with example values
    let renderedText = text
      .replace(/\{\{nome\}\}/gi, contactName)
      .replace(/\{\{telefone\}\}/gi, '5511999999999')
      .replace(/\{\{saudacao\}\}/gi, 'Bom dia')
      .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{dia_semana\}\}/gi, new Date().toLocaleDateString('pt-BR', { weekday: 'long' }));
    
    // Handle WhatsApp formatting
    // Bold: *text*
    renderedText = renderedText.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    // Italic: _text_
    renderedText = renderedText.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Strikethrough: ~text~
    renderedText = renderedText.replace(/~([^~]+)~/g, '<del>$1</del>');
    // Monospace: ```text```
    renderedText = renderedText.replace(/```([^`]+)```/g, '<code class="bg-black/10 px-1 rounded font-mono text-xs">$1</code>');
    
    return renderedText;
  };

  const currentTime = useMemo(() => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const hasContent = messages.some(m => m.text.trim() || m.mediaUrl);

  return (
    <div className="flex flex-col h-full">
      {/* Phone Frame */}
      <div className="relative w-full max-w-[280px] mx-auto">
        {/* Phone bezel */}
        <div className="rounded-[2rem] bg-gray-900 p-2 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
          
          {/* Screen */}
          <div className="rounded-[1.5rem] overflow-hidden bg-[#0b141a] h-[480px] flex flex-col">
            {/* WhatsApp header */}
            <div className="bg-[#202c33] px-3 py-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center">
                <span className="text-white/70 text-sm font-semibold">
                  {contactName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{contactName}</p>
                <p className="text-[#8696a0] text-xs">online</p>
              </div>
            </div>

            {/* Chat background */}
            <div 
              className="flex-1 p-3 overflow-y-auto"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#0b141a'
              }}
            >
              {!hasContent ? (
                <div className="flex items-center justify-center h-full text-center">
                  <p className="text-[#8696a0] text-sm px-4">
                    Digite uma mensagem para ver o preview
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message, index) => {
                    if (!message.text.trim() && !message.mediaUrl) return null;
                    
                    return (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[85%] relative">
                          {/* Message bubble */}
                          <div className="bg-[#005c4b] rounded-lg px-2.5 py-1.5 shadow-sm">
                            {/* Media preview */}
                            {message.mediaUrl && (
                              <div className="mb-1.5 -mx-1 -mt-0.5">
                                {message.mediaType === 'image' ? (
                                  <img 
                                    src={message.mediaUrl} 
                                    alt="" 
                                    className="w-full rounded-md object-cover max-h-[150px]"
                                  />
                                ) : message.mediaType === 'video' ? (
                                  <div className="w-full h-[100px] bg-black/30 rounded-md flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                                    </div>
                                  </div>
                                ) : message.mediaType === 'audio' ? (
                                  <div className="flex items-center gap-2 p-2 bg-black/10 rounded-md">
                                    <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center">
                                      <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                                    </div>
                                    <div className="flex-1 h-1 bg-white/30 rounded-full">
                                      <div className="h-full w-1/3 bg-white rounded-full" />
                                    </div>
                                    <span className="text-[10px] text-white/70">0:15</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-2 bg-black/10 rounded-md">
                                    <div className="w-8 h-8 rounded bg-red-500/80 flex items-center justify-center text-white text-[8px] font-bold">
                                      PDF
                                    </div>
                                    <span className="text-xs text-white/90 truncate flex-1">
                                      {message.mediaName || 'documento.pdf'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Text */}
                            {message.text && (
                              <p 
                                className="text-white text-[13px] leading-relaxed whitespace-pre-wrap break-words"
                                dangerouslySetInnerHTML={{ __html: renderMessageText(message.text) || '' }}
                              />
                            )}
                            
                            {/* Time and checkmarks */}
                            <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                              <span className="text-[10px] text-white/60">{currentTime}</span>
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                            </div>
                          </div>
                          
                          {/* Bubble tail */}
                          <div 
                            className="absolute top-0 -right-1.5 w-3 h-3 overflow-hidden"
                          >
                            <div className="absolute -left-1.5 top-0 w-3 h-3 bg-[#005c4b] rotate-45" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="bg-[#202c33] px-2 py-2 flex items-center gap-2">
              <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                <span className="text-[#8696a0] text-sm">Mensagem</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
