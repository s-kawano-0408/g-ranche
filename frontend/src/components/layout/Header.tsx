interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  onTitleClick?: () => void;
}

export default function Header({ title, description, children, onTitleClick }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-3 pl-10 lg:pl-0">
        <div className="min-w-0">
          <h2
            className={`text-lg sm:text-xl font-bold text-gray-900 truncate ${onTitleClick ? 'cursor-pointer hover:text-teal-600' : ''}`}
            onClick={onTitleClick}
          >
            {title}
          </h2>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-wrap">{children}</div>}
      </div>
    </div>
  );
}
